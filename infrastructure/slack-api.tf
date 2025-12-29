# =============================================================================
# Slack Integration - API Gateway + Lambda
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Function
# -----------------------------------------------------------------------------

# IAM Role for Lambda execution
resource "aws_iam_role" "slack_lambda_role" {
  name = "${var.project_name}-${var.environment}-slack-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "slack_lambda_basic" {
  role       = aws_iam_role.slack_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Archive the Lambda code
data "archive_file" "slack_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/slack-handler"
  output_path = "${path.module}/lambda/slack-handler.zip"
}

# Lambda Function
resource "aws_lambda_function" "slack_handler" {
  filename         = data.archive_file.slack_lambda_zip.output_path
  function_name    = "${var.project_name}-${var.environment}-slack-handler"
  role             = aws_iam_role.slack_lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.slack_lambda_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      DOMAIN              = var.domain_name
      SLACK_CLIENT_ID     = var.slack_client_id
      SLACK_CLIENT_SECRET = var.slack_client_secret
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "slack_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.slack_handler.function_name}"
  retention_in_days = 14

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# API Gateway (HTTP API - cheaper and simpler than REST API)
# -----------------------------------------------------------------------------

# HTTP API
resource "aws_apigatewayv2_api" "slack_api" {
  name          = "${var.project_name}-${var.environment}-slack-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["Content-Type", "X-Slack-Signature", "X-Slack-Request-Timestamp"]
    max_age       = 300
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "slack_lambda" {
  api_id                 = aws_apigatewayv2_api.slack_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.slack_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route: POST /slack/todo (Slack slash command)
resource "aws_apigatewayv2_route" "slack_todo" {
  api_id    = aws_apigatewayv2_api.slack_api.id
  route_key = "POST /slack/todo"
  target    = "integrations/${aws_apigatewayv2_integration.slack_lambda.id}"
}

# Route: POST /slack/interactions (Slack interactive components)
resource "aws_apigatewayv2_route" "slack_interactions" {
  api_id    = aws_apigatewayv2_api.slack_api.id
  route_key = "POST /slack/interactions"
  target    = "integrations/${aws_apigatewayv2_integration.slack_lambda.id}"
}

# Route: GET /slack/health (Health check)
resource "aws_apigatewayv2_route" "slack_health" {
  api_id    = aws_apigatewayv2_api.slack_api.id
  route_key = "GET /slack/health"
  target    = "integrations/${aws_apigatewayv2_integration.slack_lambda.id}"
}

# Route: GET /slack/oauth/callback (OAuth callback for "Add to Slack")
resource "aws_apigatewayv2_route" "slack_oauth_callback" {
  api_id    = aws_apigatewayv2_api.slack_api.id
  route_key = "GET /slack/oauth/callback"
  target    = "integrations/${aws_apigatewayv2_integration.slack_lambda.id}"
}

# Default stage with auto-deploy
resource "aws_apigatewayv2_stage" "slack_api_stage" {
  api_id      = aws_apigatewayv2_api.slack_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.slack_api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "slack_api_logs" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}-slack-api"
  retention_in_days = 14

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Lambda permission for API Gateway to invoke
resource "aws_lambda_permission" "slack_api_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.slack_api.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# Custom Domain for API Gateway (HTTPS with valid certificate)
# Uses the same certificate as the website (defined in main.tf)
# -----------------------------------------------------------------------------

# Custom domain name for API Gateway
resource "aws_apigatewayv2_domain_name" "slack_api" {
  domain_name = "api.${var.domain_name}"

  domain_name_configuration {
    # Reuse the main website certificate (includes api.* as SAN)
    certificate_arn = aws_acm_certificate.website.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  depends_on = [aws_acm_certificate.website]

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Map the custom domain to the API
resource "aws_apigatewayv2_api_mapping" "slack_api" {
  api_id      = aws_apigatewayv2_api.slack_api.id
  domain_name = aws_apigatewayv2_domain_name.slack_api.id
  stage       = aws_apigatewayv2_stage.slack_api_stage.id
}

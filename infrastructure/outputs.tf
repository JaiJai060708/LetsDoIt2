output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_url" {
  description = "The URL of the CloudFront distribution"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "custom_domain_url" {
  description = "The custom domain URL"
  value       = "https://${var.domain_name}"
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.website.arn
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.website.arn
}

# ACM Certificate DNS validation records (covers lets-do-it.xyz, www, and api subdomains)
output "acm_certificate_validation_records" {
  description = "DNS records needed to validate the ACM certificate. Add these CNAME records in Namecheap for all domains (including api.*)."
  value = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

# DNS records for pointing domain to CloudFront
output "dns_records_for_namecheap" {
  description = "DNS records to add in Namecheap Advanced DNS"
  value = {
    apex_domain = {
      host        = "@"
      type        = "ALIAS or ANAME (if supported) or A Record with ALIAS"
      value       = aws_cloudfront_distribution.website.domain_name
      note        = "Namecheap doesn't support ALIAS for apex. Use URL Redirect to www, or consider Route53."
    }
    www = {
      host  = "www"
      type  = "CNAME"
      value = aws_cloudfront_distribution.website.domain_name
    }
  }
}

# =============================================================================
# Slack API Outputs
# =============================================================================

output "slack_api_endpoint" {
  description = "The base URL of the Slack API Gateway (direct AWS endpoint)"
  value       = aws_apigatewayv2_api.slack_api.api_endpoint
}

output "slack_api_custom_domain" {
  description = "Custom domain for Slack API (use this in Slack app config)"
  value       = "https://api.${var.domain_name}"
}

output "slack_todo_url" {
  description = "URL for Slack /todo slash command (custom domain)"
  value       = "https://api.${var.domain_name}/slack/todo"
}

output "slack_interactions_url" {
  description = "URL for Slack interactive components (custom domain)"
  value       = "https://api.${var.domain_name}/slack/interactions"
}

output "slack_oauth_redirect_url" {
  description = "OAuth redirect URL for Slack app (add this in Slack App Settings > OAuth & Permissions)"
  value       = "https://api.${var.domain_name}/slack/oauth/callback"
}

output "slack_lambda_function_name" {
  description = "Name of the Slack handler Lambda function"
  value       = aws_lambda_function.slack_handler.function_name
}

output "slack_lambda_function_arn" {
  description = "ARN of the Slack handler Lambda function"
  value       = aws_lambda_function.slack_handler.arn
}

output "slack_api_cname_record" {
  description = "CNAME record to add in Namecheap for api.lets-do-it.xyz"
  value = {
    host  = "api"
    type  = "CNAME"
    value = aws_apigatewayv2_domain_name.slack_api.domain_name_configuration[0].target_domain_name
  }
}

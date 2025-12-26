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

# ACM Certificate DNS validation records
output "acm_certificate_validation_records" {
  description = "DNS records needed to validate the ACM certificate. Add these CNAME records in Namecheap."
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


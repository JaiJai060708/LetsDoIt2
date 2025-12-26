# LetsDoIt Infrastructure

Terraform configuration for deploying the LetsDoIt app to AWS CloudFront with custom domain.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- AWS CLI configured with profile `codya`
- Node.js and npm (for building the app)
- Domain registered (lets-do-it.xyz via Namecheap)

## Architecture

- **S3 Bucket**: Stores the static build files (private, no public access)
- **CloudFront Distribution**: CDN that serves the app globally via HTTPS
- **Origin Access Control (OAC)**: Secures S3 access through CloudFront only
- **ACM Certificate**: SSL/TLS certificate for custom domain (auto-created in us-east-1)

## Initial Setup

1. Initialize Terraform:

```bash
cd infrastructure
terraform init
```

2. Review the planned changes:

```bash
terraform plan
```

3. Apply the infrastructure:

```bash
terraform apply
```

## Custom Domain Setup (lets-do-it.xyz)

### Step 1: Clean Up Namecheap Redirects

In **Namecheap Dashboard > Domain List > Manage > Advanced DNS**:

1. **Delete any URL Redirect Records** pointing to CloudFront or anywhere else
2. **Disable Domain Forwarding** if enabled (check "Redirect Domain" section)
3. Remove any conflicting A, AAAA, or CNAME records for `@` and `www`

### Step 2: Validate ACM Certificate

After running `terraform apply`, get the DNS validation records:

```bash
terraform output acm_certificate_validation_records
```

In **Namecheap Advanced DNS**, add the CNAME records shown in the output:
- **Host**: The part before your domain (e.g., `_abc123def.lets-do-it.xyz` → enter `_abc123def`)
- **Type**: CNAME
- **Value**: The value from the output (ends with `.acm-validations.aws.`)

⚠️ **Wait for certificate validation** (can take 5-30 minutes). Check status:

```bash
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw acm_certificate_arn 2>/dev/null || echo "Run terraform apply first") \
  --query 'Certificate.Status' \
  --profile codya
```

### Step 3: Point DNS to CloudFront

Get the CloudFront domain:

```bash
terraform output cloudfront_domain_name
```

#### For `www.lets-do-it.xyz` (easy):
Add in Namecheap Advanced DNS:
- **Host**: `www`
- **Type**: CNAME
- **Value**: `<cloudfront_domain_name>` (e.g., `d1234abcd.cloudfront.net`)

#### For `lets-do-it.xyz` apex domain (tricky):

Namecheap **does not support ALIAS/ANAME records** for apex domains. You have 3 options:

**Option A: Use Namecheap's A Record (limited)**
CloudFront IPs change, so this isn't recommended for production.

**Option B: Redirect apex to www (simple)**
In Namecheap, use URL Redirect:
- **Host**: `@`
- **Type**: URL Redirect (301)
- **Value**: `https://www.lets-do-it.xyz`

Then access your site at `www.lets-do-it.xyz`

**Option C: Use Route53 (recommended for apex)**
Transfer DNS management to AWS Route53, which supports ALIAS records for apex domains:

```hcl
# Add to main.tf if using Route53
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}
```

Then update Namecheap nameservers to Route53's NS records.

## Deploying the App

After the infrastructure is created, deploy the app:

```bash
# Make the deploy script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

Or manually:

```bash
# Build the app
cd ../LetsDoItApp
npm run build

# Get bucket name
cd ../infrastructure
BUCKET_NAME=$(terraform output -raw s3_bucket_name)

# Sync to S3
aws s3 sync ../LetsDoItApp/dist s3://$BUCKET_NAME --delete --profile codya

# Invalidate CloudFront cache (optional, for immediate updates)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile codya
```

## Outputs

After applying, Terraform will output:

- `cloudfront_url` - The CloudFront URL (always works)
- `custom_domain_url` - Your custom domain URL
- `cloudfront_distribution_id` - CloudFront distribution ID
- `cloudfront_domain_name` - CloudFront domain (use for DNS CNAME)
- `s3_bucket_name` - S3 bucket name for deployments
- `acm_certificate_validation_records` - DNS records for certificate validation

## Destroying Infrastructure

To tear down all resources:

```bash
# First, empty the S3 bucket
aws s3 rm s3://$(terraform output -raw s3_bucket_name) --recursive --profile codya

# Then destroy the infrastructure
terraform destroy
```


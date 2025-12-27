#!/bin/bash
set -e

# Configuration
AWS_PROFILE="codya"
AWS_REGION="us-east-1"
APP_DIR="../LetsDoItApp"
export AWS_PAGER=""  # Disable AWS CLI pager to avoid requiring 'q' to exit

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building the app...${NC}"
cd "$APP_DIR"
npm run build

echo -e "${BLUE}Getting S3 bucket name from Terraform...${NC}"
cd ../infrastructure
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)

echo -e "${BLUE}Syncing build files to S3...${NC}"
aws s3 sync "$APP_DIR/dist" "s3://$BUCKET_NAME" \
  --delete \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"

echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --profile "$AWS_PROFILE"

CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${GREEN}App is available at: $CLOUDFRONT_URL${NC}"


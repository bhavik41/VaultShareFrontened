#!/bin/bash
# Run this locally after installing AWS CLI
# Usage: ./s3-deploy.sh <your-s3-bucket-name>

BUCKET=$1

if [ -z "$BUCKET" ]; then
  echo "Usage: ./s3-deploy.sh <bucket-name>"
  exit 1
fi

# Build the frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://$BUCKET --delete

# Set public read on all files
aws s3api put-bucket-policy --bucket $BUCKET --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET/*\"
  }]
}"

echo "Frontend deployed to: http://$BUCKET.s3-website-us-east-1.amazonaws.com"

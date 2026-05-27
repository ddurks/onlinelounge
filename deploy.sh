#!/usr/bin/env bash
# Deploy OnlineLounge frontend to S3 + CloudFront
#
# Usage:
#   ./deploy.sh
#   ./deploy.sh --no-invalidate

set -e

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="onlinelounge-drawvid-frontend-$AWS_ACCOUNT_ID"
CLOUDFRONT_DIST_ID="E3E6AK9OMDPA7M"  # onlinelounge.drawvid.com distribution
SKIP_INVALIDATE="${1:---invalidate}"

echo "================================"
echo "Deploying OnlineLounge Frontend"
echo "================================"
echo "S3 bucket:   $BUCKET_NAME"
echo "CloudFront:  $CLOUDFRONT_DIST_ID"
echo ""

# Build
echo "Building frontend..."
cd public
npx webpack --mode production
cd ..

# Deploy to S3
echo ""
echo "Deploying to S3..."

echo "   Assets (1h cache)..."
aws s3 sync public/assets "s3://$BUCKET_NAME/assets" \
  --cache-control "public, max-age=3600" \
  --delete \
  --region us-east-2

echo "   index.html (no cache)..."
aws s3 cp public/index.html "s3://$BUCKET_NAME/index.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-2

echo "   HTML forms (no cache)..."
aws s3 cp public/loginform.html "s3://$BUCKET_NAME/loginform.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-2

aws s3 cp public/chatbox.html "s3://$BUCKET_NAME/chatbox.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-2

aws s3 cp public/gif-viewer.html "s3://$BUCKET_NAME/gif-viewer.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-2

echo "   Bundle files..."
aws s3 cp public/app.bundle.js "s3://$BUCKET_NAME/app.bundle.js" \
  --cache-control "public, max-age=3600" \
  --region us-east-2

aws s3 cp public/app.bundle.js.LICENSE.txt "s3://$BUCKET_NAME/app.bundle.js.LICENSE.txt" \
  --cache-control "public, max-age=3600" \
  --region us-east-2

# Invalidate CloudFront
if [[ "$SKIP_INVALIDATE" != "--no-invalidate" ]]; then
  echo ""
  echo "Invalidating CloudFront..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

  echo "   ID: $INVALIDATION_ID"
  echo "   Check: aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DIST_ID --id $INVALIDATION_ID"
else
  echo ""
  echo "Skipped CloudFront invalidation"
fi

echo ""
echo "Done! https://onlinelounge.drawvid.com"

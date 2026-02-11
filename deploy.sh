#!/usr/bin/env bash
# Deploy OnlineLounge frontend to S3 + CloudFront
#
# This script builds the OnlineLounge frontend and deploys it to S3,
# then invalidates the CloudFront cache so changes are immediately live.
#
# Usage:
#   ./deploy.sh
#   ./deploy.sh --no-invalidate  # Skip CloudFront invalidation

set -e

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="onlinelounge-drawvid-frontend-$AWS_ACCOUNT_ID"
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_ID:-}"  # Set via env var or update here
SKIP_INVALIDATE="${1:---invalidate}"

if [ -z "$CLOUDFRONT_DIST_ID" ]; then
  echo "❌ Error: CLOUDFRONT_DIST_ID not set"
  echo ""
  echo "Set it with:"
  echo "  export CLOUDFRONT_DIST_ID='E...' && ./deploy.sh"
  echo ""
  echo "Or update this script and hardcode the distribution ID"
  exit 1
fi

echo "================================"
echo "🚀 Deploying OnlineLounge Frontend"
echo "================================"
echo "S3 bucket:   $BUCKET_NAME"
echo "CloudFront:  $CLOUDFRONT_DIST_ID"
echo ""

# Build
echo "📦 Building frontend..."
cd public
npx webpack --mode production
cd ..

# Deploy to S3
echo ""
echo "📤 Deploying to S3..."

# Create bucket if it doesn't exist
aws s3 mb "s3://$BUCKET_NAME" --region us-east-2 2>/dev/null || true

# Configure bucket as static website
cat > /tmp/bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/*"
    }
  ]
}
EOF

BUCKET_POLICY=$(cat /tmp/bucket-policy.json | sed "s|BUCKET_NAME|$BUCKET_NAME|g")
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "$BUCKET_POLICY" --region us-east-2 2>/dev/null || true

# Configure static website hosting
aws s3api put-bucket-website \
  --bucket "$BUCKET_NAME" \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }' \
  --region us-east-2 2>/dev/null || true

# Disable block public access
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region us-east-2 2>/dev/null || true

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
  echo "🔄 Invalidating CloudFront..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
  
  echo "   Invalidation ID: $INVALIDATION_ID"
  echo "   Waiting for invalidation to complete..."
  
  aws cloudfront wait invalidation-completed \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --id "$INVALIDATION_ID"
  
  echo "   ✅ Done!"
else
  echo ""
  echo "⏭️  Skipped CloudFront invalidation"
  echo "   Run 'aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths \"/*\"' to invalidate manually"
fi

echo ""
echo "================================"
echo "✅ Deployment complete!"
echo "================================"
echo ""
echo "Frontend URL: https://onlinelounge.drawvid.com"
echo "S3 URL: https://$BUCKET_NAME.s3-website.us-east-2.amazonaws.com"
echo ""

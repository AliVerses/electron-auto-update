terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-east-1" # Change to your desired region
}
data "aws_caller_identity" "current" {}

# Create an S3 bucket with private access by default
module "s3_bucket" {
  #checkov:skip=CKV_TF_1
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "4.3.0"

  bucket = "electron-update-auto" # Namespace, AWS A/C Id & Region are added to the bucket name to make it unique
  acl    = "private"

  control_object_ownership = true
  object_ownership         = "ObjectWriter"
  force_destroy            = true

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        # kms_master_key_id = module.kms.key_arn
        sse_algorithm = "AES256" #"aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_policy" "allow_access_from_cloudfront" {
  bucket = module.s3_bucket.s3_bucket_id
  policy = jsonencode({
    "Version" : "2008-10-17",
    "Id" : "PolicyForCloudFrontPrivateContent",
    "Statement" : [
      {
        "Sid" : "AllowCloudFrontServicePrincipal",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "cloudfront.amazonaws.com"
        },
        "Action" : "s3:GetObject",
        "Resource" : "${module.s3_bucket.s3_bucket_arn}/*",
        "Condition" : {
          "StringEquals" : {
            "AWS:SourceArn" : "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${module.cdn.cloudfront_distribution_id}"
          }
        }
      }
    ]
  })
}

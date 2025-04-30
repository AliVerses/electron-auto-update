resource "aws_cloudfront_cache_policy" "s3_cache_policy" {
  name        = "electron-update-s3-cache-policy"
  comment     = "S3 cache policy for electron-update- environment"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "s3_caching_disabled_policy" {
  name        = "electron-update-s3_caching_disabled_policy"
  comment     = "S3 no-cache policy for electron-update- environment"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "api_gw_cache_policy" {
  name        = "electron-update-api-gateway-cache-policy"
  comment     = "API Gateway cache policy for electron-update- environment"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "api_gw_origin_request_policy" {
  name    = "electron-update-api-gateway-origin-request-policy"
  comment = "API Gateway origin request policy for electron-update- environment"
  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "allExcept"
    headers {
      items = ["host"]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

module "cdn" {
  #checkov:skip=CKV_TF_1
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "4.1.0"


  comment             = "CloudFront for electron-update- environment"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  retain_on_delete    = false
  wait_for_deployment = false

  create_origin_access_control = true
  origin_access_control = {
    "electron-update-s3-oac" = {
      description      = "OAC for electron-update- environment"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }


  origin = {
    s3_update = {
      domain_name           = module.s3_bucket.s3_bucket_bucket_domain_name
      origin_access_control = "electron-update-s3-oac"
      origin_shield = {
        enabled              = true
        origin_shield_region = "us-east-1"
      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "s3_update"
    viewer_protocol_policy = "https-only"

    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    query_string               = true
    cache_policy_id            = aws_cloudfront_cache_policy.s3_cache_policy.id
    origin_request_policy_id   = null
    use_forwarded_values       = false
    response_headers_policy_id = null
  }

  ordered_cache_behavior = [
    {
      path_pattern           = "*"
      target_origin_id       = "s3_update"
      viewer_protocol_policy = "https-only"

      allowed_methods            = ["GET", "HEAD", "OPTIONS"]
      cached_methods             = ["GET", "HEAD"]
      compress                   = true
      query_string               = true
      cache_policy_id            = aws_cloudfront_cache_policy.s3_caching_disabled_policy.id
      origin_request_policy_id   = null
      use_forwarded_values       = false
      response_headers_policy_id = null
    }
  ]

  depends_on = [
    module.s3_bucket
  ]
}

# resource "aws_cloudfront_response_headers_policy" "security_headers" {
#   name = "electron-update-security-headers-policy"

#   security_headers_config {
#     content_security_policy {
#       content_security_policy = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' *.gehealthcloud.com *.gehealthcloud.io *.gehealthcare.com;"
#       override                = true
#     }
#     content_type_options {
#       override = true
#     }
#     frame_options {
#       frame_option = "DENY"
#       override     = true
#     }
#     referrer_policy {
#       referrer_policy = "no-referrer"
#       override        = true
#     }
#     strict_transport_security {
#       access_control_max_age_sec = 63072000
#       include_subdomains         = true
#       override                   = true
#       preload                    = true
#     }
#     xss_protection {
#       mode_block = true
#       override   = true
#       protection = true
#     }
#   }
# }
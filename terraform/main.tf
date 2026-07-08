terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  backend "s3" {
    bucket = "aurora-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "aurora"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "aurora-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
}

# ECS Cluster
resource "aws_ecs_cluster" "aurora" {
  name = "aurora-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "aurora" {
  identifier           = "aurora-${var.environment}"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.environment == "production" ? "db.r6g.large" : "db.t3.micro"
  allocated_storage    = 100
  max_allocated_storage  = 1000
  storage_type         = "gp3"
  storage_encrypted    = true

  db_name  = "aurora"
  username = "postgres"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.aurora.name

  backup_retention_period = var.environment == "production" ? 30 : 7
  deletion_protection     = var.environment == "production"

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  skip_final_snapshot = var.environment != "production"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "aurora-${var.environment}"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.environment == "production" ? "cache.r6g.large" : "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [aws_security_group.redis.id]
  subnet_group_name    = aws_elasticache_subnet_group.aurora.name
}

# S3 Bucket for downloads
resource "aws_s3_bucket" "downloads" {
  bucket = "aurora-downloads-${var.environment}-${random_id.suffix.hex}"
}

resource "aws_s3_bucket_lifecycle_configuration" "downloads" {
  bucket = aws_s3_bucket.downloads.id

  rule {
    id     = "expire-old-downloads"
    status = "Enabled"

    expiration {
      days = 7
    }
  }
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true
  aliases = [var.domain]

  origin {
    domain_name = aws_lb.aurora.dns_name
    origin_id   = "ALB"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB"
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.aurora.arn
    ssl_support_method  = "sni-only"
  }
}

# Random password
resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "random_id" "suffix" {
  byte_length = 4
}

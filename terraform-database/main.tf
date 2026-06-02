terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Provider allocations for multi-region active-active meshes
provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

resource "aws_dynamodb_table" "global_session_store" {
  provider         = aws.primary
  name             = "global-session-store-2026"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "SessionId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "SessionId"
    type = "S"
  }

  # Multi-Region replication block configuration
  replica {
    region_name = var.secondary_region
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Architecture = "Edge-Global-Gateway-Mesh"
    Compliance   = "Zero-Data-Loss"
  }
}
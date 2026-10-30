variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
}

variable "vpc_network_id" {
  type        = string
  description = "VPC network ID for Cloud SQL private IP connection"
}

variable "db_password" {
  type        = string
  sensitive   = true
}

variable "backend_image_uri" {
  type        = string
  description = "Artifact Registry image URI for backend"
}

variable "agentic_image_uri" {
  type        = string
  description = "Artifact Registry image URI for agentic worker"
}

variable "frontend_image_uri" {
  type        = string
  description = "Artifact Registry image URI for frontend"
}

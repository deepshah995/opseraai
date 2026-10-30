variable "instance_name" {
  type        = string
  description = "Cloud SQL instance name"
}

variable "region" {
  type        = string
  default     = "us-central1"
}

variable "tier" {
  type        = string
  default     = "db-custom-2-7680"
}

variable "availability_type" {
  type        = string
  default     = "REGIONAL"
}

variable "disk_size_gb" {
  type        = number
  default     = 50
}

variable "private_network_id" {
  type        = string
  description = "VPC network ID for private IP access"
}

variable "database_name" {
  type        = string
  default     = "ops_agent"
}

variable "db_user" {
  type        = string
  default     = "ops_user"
}

variable "db_password" {
  type        = string
  sensitive   = true
}

variable "deletion_protection" {
  type        = bool
  default     = true
}

variable "bucket_name" {
  type        = string
  description = "GCS bucket name"
}

variable "region" {
  type        = string
  default     = "us-central1"
}

variable "cors_origins" {
  type        = list(string)
  default     = ["*"]
}

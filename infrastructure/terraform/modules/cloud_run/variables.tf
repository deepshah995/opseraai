variable "service_name" {
  type        = string
  description = "The name of the Cloud Run service"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "image_uri" {
  type        = string
  description = "Container image URI"
}

variable "ingress" {
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
}

variable "min_instances" {
  type        = number
  default     = 0
}

variable "max_instances" {
  type        = number
  default     = 10
}

variable "cpu_limit" {
  type        = string
  default     = "1000m"
}

variable "memory_limit" {
  type        = string
  default     = "1024Mi"
}

variable "environment_variables" {
  type        = map(string)
  default     = {}
}

variable "allow_unauthenticated" {
  type        = bool
  default     = true
}

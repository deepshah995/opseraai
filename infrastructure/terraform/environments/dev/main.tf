terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- Cloud Storage for Operational Documents ---
module "documents_storage" {
  source      = "../../modules/cloud_storage"
  bucket_name = "${var.project_id}-ops-documents-dev"
  region      = var.region
}

# --- Cloud SQL PostgreSQL ---
module "database" {
  source              = "../../modules/cloud_sql"
  instance_name       = "ops-agent-db-dev"
  region              = var.region
  tier                = "db-custom-1-3840"
  availability_type   = "ZONAL"
  disk_size_gb        = 20
  private_network_id  = var.vpc_network_id
  database_name       = "ops_agent_dev"
  db_user             = "ops_app"
  db_password         = var.db_password
  deletion_protection = false
}

# --- Cloud Run Backend API ---
module "backend_api" {
  source                 = "../../modules/cloud_run"
  service_name           = "ops-agent-backend-dev"
  region                 = var.region
  image_uri              = var.backend_image_uri
  min_instances          = 0
  max_instances          = 3
  cpu_limit              = "1000m"
  memory_limit           = "1024Mi"
  allow_unauthenticated  = true
  environment_variables = {
    ENVIRONMENT       = "development"
    DATABASE_URL      = "postgresql+psycopg2://${module.database.db_user}:${var.db_password}@${module.database.private_ip_address}:5432/${module.database.database_name}"
    STORAGE_BACKEND   = "gcs"
    GCS_BUCKET_NAME   = module.documents_storage.bucket_name
    VERTEX_AI_PROJECT = var.project_id
    GEMINI_MODEL      = "gemini-1.5-pro"
  }
}

# --- Cloud Run Agentic Worker ---
module "agentic_worker" {
  source                 = "../../modules/cloud_run"
  service_name           = "ops-agent-agentic-dev"
  region                 = var.region
  image_uri              = var.agentic_image_uri
  min_instances          = 0
  max_instances          = 3
  cpu_limit              = "1000m"
  memory_limit           = "1024Mi"
  allow_unauthenticated  = false
  environment_variables = {
    ENVIRONMENT       = "development"
    VERTEX_AI_PROJECT = var.project_id
    GEMINI_MODEL      = "gemini-1.5-pro"
  }
}

# --- Cloud Run Frontend Dashboard ---
module "frontend_dashboard" {
  source                 = "../../modules/cloud_run"
  service_name           = "ops-agent-frontend-dev"
  region                 = var.region
  image_uri              = var.frontend_image_uri
  min_instances          = 0
  max_instances          = 3
  cpu_limit              = "1000m"
  memory_limit           = "512Mi"
  allow_unauthenticated  = true
  environment_variables = {
    BACKEND_API_URL = module.backend_api.uri
  }
}

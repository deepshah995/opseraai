# Production Deployment Guide (Google Cloud Platform)

This guide covers deploying the AI Operations Exception Agent to Google Cloud Platform using Terraform and Cloud Run.

---

## 1. GCP Architecture Topology

- **Compute**: Google Cloud Run (Serverless autoscaling with concurrency)
  - `ops-agent-backend`: REST API handling multi-tenant business logic
  - `ops-agent-agentic`: LangGraph stateful investigation runner
  - `ops-agent-frontend`: Next.js production SSR dashboard
- **Database**: Cloud SQL for PostgreSQL 15 (Regional HA with private IP and SSL enforcement)
- **Object Storage**: Google Cloud Storage (Nearline retention lifecycle for uploaded PDFs and manifests)
- **AI Inference**: Vertex AI (Gemini 1.5 Pro)
- **Secret Management**: Google Secret Manager
- **CI/CD**: GitHub Actions via Workload Identity Federation

---

## 2. Infrastructure Deployment with Terraform

### Step 1: Configure Environment Variables
```bash
cd infrastructure/terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
```
Update `terraform.tfvars`:
```hcl
project_id          = "your-gcp-project-id"
region              = "us-central1"
vpc_network_id      = "projects/your-gcp-project-id/global/networks/default"
db_password         = "SecureProdDBPassword123!"
backend_image_uri   = "us-central1-docker.pkg.dev/your-project/ops-agent-containers/backend:latest"
agentic_image_uri   = "us-central1-docker.pkg.dev/your-project/ops-agent-containers/agentic:latest"
frontend_image_uri  = "us-central1-docker.pkg.dev/your-project/ops-agent-containers/frontend:latest"
```

### Step 2: Initialize & Apply Terraform
```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

---

## 3. Database Schema Migrations

Run database migrations against Cloud SQL using Cloud SQL Auth Proxy:
```bash
# Start proxy
cloud-sql-proxy your-gcp-project-id:us-central1:ops-agent-db-prod --port 5432

# Apply Alembic migrations
cd backend
DATABASE_URL="postgresql+psycopg2://ops_admin:SecureProdDBPassword123!@127.0.0.1:5432/ops_agent_prod" alembic upgrade head
```

---

## 4. GitHub Actions CI/CD Setup

Configure the following GitHub repository secrets:
- `GCP_PROJECT_ID`: Your GCP Project ID
- `WIF_PROVIDER`: Workload Identity Provider resource string
- `WIF_SERVICE_ACCOUNT`: Service account email with Cloud Run Developer & Artifact Registry Writer roles

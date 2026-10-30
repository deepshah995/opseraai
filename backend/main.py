import logging
from contextlib import asynccontextmanager

from backend.app.api.routes.agents import router as agents_router
from backend.app.api.routes.analytics import router as analytics_router
from backend.app.api.routes.approvals import router as approvals_router
from backend.app.api.routes.audit import router as audit_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.documents import router as docs_router
from backend.app.api.routes.exceptions import router as exceptions_router
from backend.app.api.routes.investigations import router as investigations_router
from backend.app.api.routes.organizations import router as orgs_router
from backend.app.api.routes.records import router as records_router
from backend.app.core.config import settings
from backend.app.core.logging import setup_logging
from backend.app.core.security import hash_password
from backend.app.db.base import Base
from backend.app.db.models import Organization, User
from backend.app.db.session import SessionLocal, engine
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

setup_logging()
logger = logging.getLogger("operations_agent")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial demo tenant and admin user if empty
    db = SessionLocal()
    try:
        existing_org = db.query(Organization).first()
        if not existing_org:
            logger.info("Initializing default tenant: Apex Industrial Waste & Recycling...")
            demo_org = Organization(
                id="apex-industrial-tenant-01",
                name="Apex Industrial Waste & Recycling",
            )
            db.add(demo_org)
            db.flush()

            demo_user = User(
                id="user-ops-mgr-01",
                organization_id=demo_org.id,
                email="manager@apexwaste.com",
                hashed_password=hash_password("OperationsPass123!"),
                display_name="Sarah Jenkins (Ops Manager)",
                role="operations_manager",
            )
            db.add(demo_user)
            db.commit()
            logger.info("Default tenant and operations manager initialized.")
    finally:
        db.close()

    yield
    logger.info("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic Reconciliation & LangGraph AI Operations Exception Agent for Industrial Services",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    try:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Content-Security-Policy"] = "frame-ancestors 'self';"
        return response
    except Exception as exc:
        logger.error(f"Unhandled exception during request processing: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred. Please contact system operations."},
            headers={
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
            },
        )

# Register API Routers
api_v1_prefix = "/api"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(orgs_router, prefix=api_v1_prefix)
app.include_router(docs_router, prefix=api_v1_prefix)
app.include_router(records_router, prefix=api_v1_prefix)
app.include_router(exceptions_router, prefix=api_v1_prefix)
app.include_router(investigations_router, prefix=api_v1_prefix)
app.include_router(approvals_router, prefix=api_v1_prefix)
app.include_router(audit_router, prefix=api_v1_prefix)
app.include_router(analytics_router, prefix=api_v1_prefix)
app.include_router(agents_router, prefix=api_v1_prefix)

@app.get("/healthz", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

import pytest
from backend.app.core.security import create_access_token, hash_password
from backend.app.db.base import Base
from backend.app.db.models import Organization, User
from backend.app.db.session import get_db
from backend.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# StaticPool ensures the in-memory SQLite database is shared across threads and connections
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Create default test org and user
    org = Organization(id="test-org-1", name="Test Industrial Waste Co")
    session.add(org)
    session.flush()

    user = User(
        id="test-user-1",
        organization_id=org.id,
        email="testops@industrial.com",
        hashed_password=hash_password("TestSecret123!"),
        display_name="Test Ops Manager",
        role="operations_manager",
    )
    session.add(user)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(db_session):
    user = db_session.query(User).filter_by(id="test-user-1").first()
    token = create_access_token(
        subject=user.id,
        organization_id=user.organization_id,
        role=user.role,
    )
    return {"Authorization": f"Bearer {token}"}

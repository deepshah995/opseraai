import hashlib
import hmac
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from backend.app.core.config import settings

# --- Password Hashing with PBKDF2-HMAC-SHA256 ---

def hash_password(password: str) -> str:
    """Hash password securely using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    )
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password in constant time to prevent timing attacks."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        _, salt, stored_hash = parts
        key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        )
        return hmac.compare_digest(key.hex(), stored_hash)
    except Exception:
        return False

# --- JWT Token Generation & Verification ---

def create_access_token(
    subject: str,
    organization_id: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    payload: dict[str, Any] = {
        "sub": subject,
        "org_id": organization_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt

def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT access token. Rejects 'none' and mismatched algorithms."""
    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub", "org_id", "role"], "verify_exp": True},
        )
        return decoded
    except (jwt.PyJWTError, Exception):
        return None

# --- Secure File Path & Boundary Validation ---

def sanitize_filename(filename: str) -> str:
    """Sanitize user-provided filename by stripping directory traversal sequences."""
    clean_name = os.path.basename(filename).replace("/", "").replace("\\", "")
    return clean_name or "unnamed_file"

def validate_safe_path(target_path: str, base_dir: str) -> str:
    """
    Ensure the resolved target path is strictly within base_dir.
    Prevents directory traversal attacks (CWE-22) using trailing-separator boundary checks.
    """
    real_base = os.path.realpath(base_dir)
    real_target = os.path.realpath(target_path)
    base_prefix = real_base if real_base.endswith(os.sep) else real_base + os.sep

    if not real_target.startswith(base_prefix) and real_target != real_base:
        raise ValueError("Invalid storage path: directory traversal detected.")
    return real_target

# --- File Type & Magic Bytes Verification ---

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".json"}

def validate_file_content(filename: str, content: bytes) -> tuple[bool, str]:
    """
    Validate file extension, size limit, and header magic bytes.
    Returns (is_valid, error_message).
    """
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES / (1024*1024):.1f} MB."
        
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    if ext == ".pdf":
        if not content.startswith(b"%PDF-"):
            return False, "Invalid PDF file: Missing %PDF- header magic bytes."
            
    elif ext == ".csv":
        # Ensure it is valid text/csv and does not contain binary/executable headers
        if b"\x00" in content[:1024]:
            return False, "Invalid CSV file: Contains null binary bytes."
            
    return True, ""

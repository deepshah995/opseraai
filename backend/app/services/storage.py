import logging
import os
import uuid
from abc import ABC, abstractmethod

from backend.app.core.config import settings
from backend.app.core.security import sanitize_filename, validate_safe_path

logger = logging.getLogger(__name__)

class StorageAdapter(ABC):
    @abstractmethod
    def save_file(self, filename: str, content: bytes, content_type: str) -> tuple[str, int]:
        """Save file bytes and return (storage_object_key, file_size_bytes)."""

    @abstractmethod
    def get_file(self, storage_object_key: str) -> bytes:
        """Retrieve file bytes by storage key."""

    @abstractmethod
    def delete_file(self, storage_object_key: str) -> bool:
        """Delete file by storage key."""

class LocalStorageAdapter(StorageAdapter):
    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, filename: str, content: bytes, content_type: str) -> tuple[str, int]:
        clean_name = sanitize_filename(filename)
        ext = os.path.splitext(clean_name)[1].lower()
        unique_key = f"{uuid.uuid4().hex}{ext}"
        
        target_path = os.path.join(self.base_dir, unique_key)
        safe_path = validate_safe_path(target_path, self.base_dir)
        
        with open(safe_path, "wb") as f:
            f.write(content)
            
        return unique_key, len(content)

    def get_file(self, storage_object_key: str) -> bytes:
        clean_key = sanitize_filename(storage_object_key)
        target_path = os.path.join(self.base_dir, clean_key)
        safe_path = validate_safe_path(target_path, self.base_dir)
        
        if not os.path.exists(safe_path):
            raise FileNotFoundError(f"File key '{clean_key}' not found in storage.")
            
        with open(safe_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_object_key: str) -> bool:
        try:
            clean_key = sanitize_filename(storage_object_key)
            target_path = os.path.join(self.base_dir, clean_key)
            safe_path = validate_safe_path(target_path, self.base_dir)
            if os.path.exists(safe_path):
                os.remove(safe_path)
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete storage key {storage_object_key}: {e}")
            return False

class GCSStorageAdapter(StorageAdapter):
    def __init__(self, bucket_name: str = settings.GCS_BUCKET_NAME):
        self.bucket_name = bucket_name
        self._client = None

    def _get_bucket(self):
        if self._client is None:
            from google.cloud import storage
            self._client = storage.Client()
        return self._client.bucket(self.bucket_name)

    def save_file(self, filename: str, content: bytes, content_type: str) -> tuple[str, int]:
        clean_name = sanitize_filename(filename)
        ext = os.path.splitext(clean_name)[1].lower()
        unique_key = f"{uuid.uuid4().hex}{ext}"
        
        bucket = self._get_bucket()
        blob = bucket.blob(unique_key)
        blob.upload_from_string(content, content_type=content_type)
        return unique_key, len(content)

    def get_file(self, storage_object_key: str) -> bytes:
        clean_key = sanitize_filename(storage_object_key)
        bucket = self._get_bucket()
        blob = bucket.blob(clean_key)
        return blob.download_as_bytes()

    def delete_file(self, storage_object_key: str) -> bool:
        try:
            clean_key = sanitize_filename(storage_object_key)
            bucket = self._get_bucket()
            blob = bucket.blob(clean_key)
            blob.delete()
            return True
        except Exception as e:
            logger.error(f"GCS deletion error for key {storage_object_key}: {e}")
            return False

def get_storage_adapter() -> StorageAdapter:
    if settings.STORAGE_BACKEND == "gcs" and settings.ENVIRONMENT != "development":
        try:
            return GCSStorageAdapter()
        except Exception as e:
            logger.warning(f"Could not initialize GCS storage adapter ({e}), falling back to LocalStorageAdapter.")
    return LocalStorageAdapter()

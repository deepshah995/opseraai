
from backend.app.api.dependencies import get_current_user
from backend.app.db.models.document import SourceDocument
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.document import DocumentResponse
from backend.app.services.documents import DocumentService
from backend.app.services.storage import get_storage_adapter
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("", response_model=list[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = db.execute(
        select(SourceDocument)
        .where(SourceDocument.organization_id == current_user.organization_id)
        .order_by(SourceDocument.created_at.desc())
    ).scalars().all()
    return [DocumentResponse.model_validate(d) for d in docs]

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("invoice_pdf"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    try:
        doc = DocumentService.upload_document(
            db=db,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            filename=file.filename or "uploaded_document.pdf",
            content=content,
            content_type=file.content_type or "application/pdf",
            document_type=document_type,
        )
        return DocumentResponse.model_validate(doc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(SourceDocument).where(
            SourceDocument.id == document_id,
            SourceDocument.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return DocumentResponse.model_validate(doc)

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(SourceDocument).where(
            SourceDocument.id == document_id,
            SourceDocument.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    storage = get_storage_adapter()
    file_bytes = storage.get_file(doc.storage_object_key)
    
    headers = {
        "Content-Disposition": f'attachment; filename="{doc.original_filename}"',
        "X-Content-Type-Options": "nosniff",
    }
    return Response(content=file_bytes, media_type=doc.content_type, headers=headers)

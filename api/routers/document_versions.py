"""Router for document versions (Oráculo)."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import DocumentVersionCreate, DocumentVersionResponse
from open_notebook.domain.document_version import DocumentVersion
from open_notebook.exceptions import InvalidInputError

router = APIRouter()


@router.get("/document-versions", response_model=List[DocumentVersionResponse])
async def list_document_versions(
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
):
    """List all document versions, optionally filtered by source."""
    try:
        all_versions = await DocumentVersion.get_all(order_by="created desc")
        if source_id:
            all_versions = [v for v in all_versions if v.source == source_id]
        return [
            DocumentVersionResponse(
                id=v.id or "",
                source=v.source,
                version_number=v.version_number,
                status=v.status,
                revision_date=str(v.revision_date) if v.revision_date else None,
                author=v.author,
                change_summary=v.change_summary,
                created=str(v.created),
                updated=str(v.updated),
            )
            for v in all_versions
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing document versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-versions/{version_id}", response_model=DocumentVersionResponse)
async def get_document_version(version_id: str):
    """Get a single document version by ID."""
    try:
        version = await DocumentVersion.get(version_id)
        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")
        return DocumentVersionResponse(
            id=version.id or "",
            source=version.source,
            version_number=version.version_number,
            status=version.status,
            revision_date=str(version.revision_date) if version.revision_date else None,
            author=version.author,
            change_summary=version.change_summary,
            created=str(version.created),
            updated=str(version.updated),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document version {version_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document-versions", response_model=DocumentVersionResponse)
async def create_document_version(data: DocumentVersionCreate):
    """Create a new document version record."""
    try:
        version = DocumentVersion(
            source=data.source,
            version_number=data.version_number,
            status=data.status,
            revision_date=data.revision_date,
            author=data.author,
            change_summary=data.change_summary,
        )
        await version.save()
        return DocumentVersionResponse(
            id=version.id or "",
            source=version.source,
            version_number=version.version_number,
            status=version.status,
            revision_date=str(version.revision_date) if version.revision_date else None,
            author=version.author,
            change_summary=version.change_summary,
            created=str(version.created),
            updated=str(version.updated),
        )
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating document version: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/document-versions/{version_id}", status_code=204)
async def delete_document_version(version_id: str):
    """Delete a document version record."""
    try:
        version = await DocumentVersion.get(version_id)
        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")
        await version.delete()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document version {version_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

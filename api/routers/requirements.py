"""Router for requirements (Oráculo)."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import RequirementCreate, RequirementResponse
from open_notebook.domain.requirement import Requirement
from open_notebook.exceptions import InvalidInputError

router = APIRouter()


@router.get("/requirements", response_model=List[RequirementResponse])
async def list_requirements(
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    req_type: Optional[str] = Query(None, description="Filter by requirement type"),
):
    """List requirements, optionally filtered by source and/or type."""
    try:
        all_reqs = await Requirement.get_all(order_by="created desc")
        if source_id:
            all_reqs = [r for r in all_reqs if r.source == source_id]
        if req_type:
            all_reqs = [r for r in all_reqs if r.req_type == req_type]
        return [
            RequirementResponse(
                id=r.id or "",
                source=r.source,
                section=r.section,
                content=r.content,
                req_type=r.req_type,
                tags=r.tags,
                created=str(r.created),
                updated=str(r.updated),
            )
            for r in all_reqs
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requirements", response_model=RequirementResponse)
async def create_requirement(data: RequirementCreate):
    """Create a new requirement record."""
    try:
        req = Requirement(
            source=data.source,
            section=data.section,
            content=data.content,
            req_type=data.req_type,
            tags=data.tags,
        )
        await req.save()
        return RequirementResponse(
            id=req.id or "",
            source=req.source,
            section=req.section,
            content=req.content,
            req_type=req.req_type,
            tags=req.tags,
            created=str(req.created),
            updated=str(req.updated),
        )
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating requirement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/requirements/{req_id}", status_code=204)
async def delete_requirement(req_id: str):
    """Delete a requirement record."""
    try:
        req = await Requirement.get(req_id)
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        await req.delete()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting requirement {req_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

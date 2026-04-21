"""Router for Equinor-standard procedure generation (Oráculo)."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import ProcedureGenerateRequest, ProcedureGenerateResponse
from open_notebook.exceptions import OpenNotebookError

router = APIRouter()


@router.post("/procedure/generate", response_model=ProcedureGenerateResponse)
async def generate_procedure(request: ProcedureGenerateRequest):
    """
    Generate a complete Equinor-standard technical procedure.

    Accepts a scope description and optional reference source IDs.
    Returns a structured procedure following the NORSOK/Equinor 7-section template.
    """
    try:
        from open_notebook.graphs.procedure import graph as procedure_graph

        result = await procedure_graph.ainvoke(
            {
                "scope": request.scope,
                "context_source_ids": request.context_source_ids or [],
                "context_text": None,
                "procedure_output": None,
            },
            config={"configurable": {"model_id": request.model_id}},
        )

        return ProcedureGenerateResponse(
            scope=request.scope,
            procedure_output=result.get("procedure_output") or "",
        )
    except OpenNotebookError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating procedure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

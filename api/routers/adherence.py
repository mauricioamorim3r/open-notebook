"""Router for adherence analysis (Oráculo)."""

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import AdherenceRequest, AdherenceResponse
from open_notebook.exceptions import OpenNotebookError

router = APIRouter()


@router.post("/adherence/analyze", response_model=AdherenceResponse)
async def analyze_adherence(request: AdherenceRequest):
    """
    Evaluate how well a target document adheres to a reference norm or regulation.

    Returns a structured adherence report with per-requirement compliance status,
    non-conformities and recommended corrective actions.
    """
    try:
        from open_notebook.graphs.adherence import graph as adherence_graph

        result = await adherence_graph.ainvoke(
            {
                "document_id": request.document_id,
                "reference_id": request.reference_id,
                "document_title": None,
                "reference_title": None,
                "document_text": None,
                "reference_text": None,
                "requirements": None,
                "adherence_report": None,
            },
            config={"configurable": {"model_id": request.model_id}},
        )

        return AdherenceResponse(
            document_id=request.document_id,
            reference_id=request.reference_id,
            document_title=result.get("document_title"),
            reference_title=result.get("reference_title"),
            adherence_report=result.get("adherence_report") or "",
        )
    except OpenNotebookError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error in adherence analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

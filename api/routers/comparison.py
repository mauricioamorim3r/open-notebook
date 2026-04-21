"""Router for document comparison analysis (Oráculo)."""

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import CompareRequest, CompareResponse
from open_notebook.exceptions import OpenNotebookError

router = APIRouter()


@router.post("/compare", response_model=CompareResponse)
async def compare_sources(request: CompareRequest):
    """
    Compare two sources and return a structured comparison report.

    The report identifies differences, gaps, conflicts and convergences
    between the two technical documents.
    """
    try:
        from open_notebook.graphs.compare import graph as compare_graph

        result = await compare_graph.ainvoke(
            {
                "source_a_id": request.source_a_id,
                "source_b_id": request.source_b_id,
                "source_a_title": None,
                "source_b_title": None,
                "source_a_text": None,
                "source_b_text": None,
                "comparison_report": None,
            },
            config={"configurable": {"model_id": request.model_id}},
        )

        return CompareResponse(
            source_a_id=request.source_a_id,
            source_b_id=request.source_b_id,
            source_a_title=result.get("source_a_title"),
            source_b_title=result.get("source_b_title"),
            comparison_report=result.get("comparison_report") or "",
        )
    except OpenNotebookError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error in comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))

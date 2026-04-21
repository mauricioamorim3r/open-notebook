"""
Procedure graph: generates a structured Equinor-standard technical procedure from a scope description
and optional reference source documents.

Usage:
    result = await graph.ainvoke(
        {
            "scope": "Procedure for calibration of Coriolis meters in FPSO Bacalhau",
            "context_source_ids": ["source:abc123", "source:def456"],
        },
        config={"configurable": {"model_id": None}},
    )
    procedure = result["procedure_output"]
"""

from typing import List, Optional

from ai_prompter import Prompter
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from open_notebook.ai.provision import provision_langchain_model
from open_notebook.domain.notebook import Source
from open_notebook.exceptions import OpenNotebookError
from open_notebook.utils import clean_thinking_content
from open_notebook.utils.error_classifier import classify_error
from open_notebook.utils.text_utils import extract_text_content


class ProcedureState(TypedDict):
    scope: str
    context_source_ids: Optional[List[str]]
    context_text: Optional[str]
    procedure_output: Optional[str]


async def collect_context(state: ProcedureState, config: RunnableConfig) -> dict:
    """Fetch full text from all reference source documents and concatenate as context."""
    source_ids = state.get("context_source_ids") or []
    if not source_ids:
        return {"context_text": None}

    try:
        parts: List[str] = []
        for sid in source_ids:
            source = await Source.get(sid)
            if source and source.full_text:
                header = f"### {source.title or sid}\n"
                parts.append(header + source.full_text)

        context_text = "\n\n---\n\n".join(parts) if parts else None
        return {"context_text": context_text}
    except OpenNotebookError:
        raise
    except Exception as e:
        error_class, user_message = classify_error(e)
        raise error_class(user_message) from e


async def generate_procedure(state: ProcedureState, config: RunnableConfig) -> dict:
    """Ask the LLM to generate the complete Equinor-standard procedure."""
    try:
        system_prompt = Prompter(prompt_template="procedure/entry").render(data=state)  # type: ignore[arg-type]
        model = await provision_langchain_model(
            system_prompt,
            config.get("configurable", {}).get("model_id"),
            "tools",
            max_tokens=8000,
        )
        ai_message = await model.ainvoke(system_prompt)
        raw_content = extract_text_content(ai_message.content)
        return {"procedure_output": clean_thinking_content(raw_content)}
    except OpenNotebookError:
        raise
    except Exception as e:
        error_class, user_message = classify_error(e)
        raise error_class(user_message) from e


_graph_state = StateGraph(ProcedureState)
_graph_state.add_node("collect_context", collect_context)
_graph_state.add_node("generate_procedure", generate_procedure)
_graph_state.add_edge(START, "collect_context")
_graph_state.add_edge("collect_context", "generate_procedure")
_graph_state.add_edge("generate_procedure", END)

graph = _graph_state.compile()

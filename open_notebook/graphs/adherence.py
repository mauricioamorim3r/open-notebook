"""
Adherence graph: evaluates how well a target document complies with a reference norm/regulation.

Usage:
    result = await graph.ainvoke(
        {
            "document_id": "source:abc123",   # document being audited
            "reference_id": "source:def456",  # norm / regulation
        },
        config={"configurable": {"model_id": None}},
    )
    report = result["adherence_report"]
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


class AdherenceState(TypedDict):
    document_id: str
    reference_id: str
    document_title: Optional[str]
    reference_title: Optional[str]
    document_text: Optional[str]
    reference_text: Optional[str]
    requirements: Optional[List[dict]]
    adherence_report: Optional[str]


async def fetch_documents(state: AdherenceState, config: RunnableConfig) -> dict:
    """Load both documents from the database."""
    try:
        document = await Source.get(state["document_id"])
        reference = await Source.get(state["reference_id"])

        if not document:
            raise OpenNotebookError(f"Document source not found: {state['document_id']}")
        if not reference:
            raise OpenNotebookError(
                f"Reference source not found: {state['reference_id']}"
            )

        return {
            "document_title": document.title or state["document_id"],
            "reference_title": reference.title or state["reference_id"],
            "document_text": document.full_text or "",
            "reference_text": reference.full_text or "",
        }
    except OpenNotebookError:
        raise
    except Exception as e:
        error_class, user_message = classify_error(e)
        raise error_class(user_message) from e


async def evaluate_adherence(state: AdherenceState, config: RunnableConfig) -> dict:
    """Ask the LLM to evaluate adherence of the document against the reference norms."""
    try:
        system_prompt = Prompter(prompt_template="adherence/entry").render(data=state)  # type: ignore[arg-type]
        model = await provision_langchain_model(
            system_prompt,
            config.get("configurable", {}).get("model_id"),
            "tools",
            max_tokens=6000,
        )
        ai_message = await model.ainvoke(system_prompt)
        raw_content = extract_text_content(ai_message.content)
        return {"adherence_report": clean_thinking_content(raw_content)}
    except OpenNotebookError:
        raise
    except Exception as e:
        error_class, user_message = classify_error(e)
        raise error_class(user_message) from e


_graph_state = StateGraph(AdherenceState)
_graph_state.add_node("fetch_documents", fetch_documents)
_graph_state.add_node("evaluate_adherence", evaluate_adherence)
_graph_state.add_edge(START, "fetch_documents")
_graph_state.add_edge("fetch_documents", "evaluate_adherence")
_graph_state.add_edge("evaluate_adherence", END)

graph = _graph_state.compile()

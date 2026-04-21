"""
Compare graph: fetches two sources by ID and generates a structured comparison report.

Usage:
    result = await graph.ainvoke(
        {
            "source_a_id": "source:abc123",
            "source_b_id": "source:def456",
        },
        config={"configurable": {"model_id": None}},
    )
    report = result["comparison_report"]
"""

from typing import Optional

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


class CompareState(TypedDict):
    source_a_id: str
    source_b_id: str
    source_a_title: Optional[str]
    source_b_title: Optional[str]
    source_a_text: Optional[str]
    source_b_text: Optional[str]
    comparison_report: Optional[str]


async def fetch_sources(state: CompareState, config: RunnableConfig) -> dict:
    """Load full text for both sources from the database."""
    try:
        source_a = await Source.get(state["source_a_id"])
        source_b = await Source.get(state["source_b_id"])

        if not source_a:
            raise OpenNotebookError(f"Source not found: {state['source_a_id']}")
        if not source_b:
            raise OpenNotebookError(f"Source not found: {state['source_b_id']}")

        return {
            "source_a_title": source_a.title or state["source_a_id"],
            "source_b_title": source_b.title or state["source_b_id"],
            "source_a_text": source_a.full_text or "",
            "source_b_text": source_b.full_text or "",
        }
    except OpenNotebookError:
        raise
    except Exception as e:
        error_class, user_message = classify_error(e)
        raise error_class(user_message) from e


async def generate_comparison(state: CompareState, config: RunnableConfig) -> dict:
    """Ask the LLM to compare the two documents and produce a structured report."""
    try:
        system_prompt = Prompter(prompt_template="compare/entry").render(data=state)  # type: ignore[arg-type]
        model = await provision_langchain_model(
            system_prompt,
            config.get("configurable", {}).get("model_id"),
            "tools",
            max_tokens=4000,
        )
        ai_message = await model.ainvoke(system_prompt)
        raw_content = extract_text_content(ai_message.content)
        return {"comparison_report": clean_thinking_content(raw_content)}
    except OpenNotebookError:
        raise
    except Exception as e:
        error_class, user_message = classify_error(e)
        raise error_class(user_message) from e


_graph_state = StateGraph(CompareState)
_graph_state.add_node("fetch_sources", fetch_sources)
_graph_state.add_node("generate_comparison", generate_comparison)
_graph_state.add_edge(START, "fetch_sources")
_graph_state.add_edge("fetch_sources", "generate_comparison")
_graph_state.add_edge("generate_comparison", END)

graph = _graph_state.compile()

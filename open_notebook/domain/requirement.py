from typing import ClassVar, List, Optional

from open_notebook.domain.base import ObjectModel


class Requirement(ObjectModel):
    """
    An extracted requirement from a normative/regulatory source.
    req_type: mandatory | recommended
    """

    table_name: ClassVar[str] = "requirement"
    nullable_fields: ClassVar[set[str]] = {"section", "tags", "embedding"}

    source: str  # record<source> stored as string "source:id"
    section: Optional[str] = None
    content: str
    req_type: str = "mandatory"
    tags: Optional[List[str]] = None
    embedding: Optional[List[float]] = None

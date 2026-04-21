from datetime import datetime
from typing import ClassVar, List, Optional

from open_notebook.domain.base import ObjectModel


class DocumentVersion(ObjectModel):
    """
    Tracks versioning of a Source document.
    status: draft | active | superseded
    """

    table_name: ClassVar[str] = "document_version"
    nullable_fields: ClassVar[set[str]] = {"revision_date", "author", "change_summary"}

    source: str  # record<source> stored as string "source:id"
    version_number: str
    status: str = "draft"
    revision_date: Optional[datetime] = None
    author: Optional[str] = None
    change_summary: Optional[str] = None

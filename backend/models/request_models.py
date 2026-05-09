from __future__ import annotations

from pydantic import BaseModel, Field, model_validator
from typing import Optional


class AnalyzeRequest(BaseModel):
    """
    Parsed form-data parameters (images are handled as UploadFile in the router).
    """
    base_item_index: Optional[int] = Field(
        default=None,
        ge=0,
        description="0-based index of the anchor item. Omit for free mode.",
    )

    @model_validator(mode="after")
    def base_item_index_type_check(self) -> "AnalyzeRequest":
        # Extra guard — pydantic already enforces ge=0; this adds clarity in errors.
        if self.base_item_index is not None and self.base_item_index < 0:
            raise ValueError("base_item_index must be a non-negative integer.")
        return self
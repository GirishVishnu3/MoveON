from pydantic import BaseModel
from typing import List, Optional

class ReviewSubmitRequest(BaseModel):
    rating: int
    feedback_text: Optional[str] = None
    categories: Optional[List[str]] = None
    is_anonymous: bool = False

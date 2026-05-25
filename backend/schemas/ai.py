from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RAGSource(BaseModel):
    document_id: int
    original_name: str
    content_snippet: str
    similarity_score: float


class RAGAnswerResponse(BaseModel):
    query: str
    answer: str
    sources: List[RAGSource]
    mode: Literal["llm", "retrieval_only"]
    model: Optional[str] = None


class ApplicationInsightsResponse(BaseModel):
    application_id: int
    startup_name: str
    executive_summary: str
    strengths: List[str]
    risks: List[str]
    diligence_questions: List[str]
    recommendation: Literal["Proceed", "Hold", "Pass"]
    mode: Literal["llm", "heuristic"]
    model: Optional[str] = None


class CoachRequest(BaseModel):
    field: Literal["problem_statement", "solution_overview", "use_of_funds", "competitive_advantage"]
    text: str = Field(..., min_length=10, max_length=4000)
    industry_sector: Optional[str] = None
    current_stage: Optional[str] = None


class CoachResponse(BaseModel):
    field: str
    original_text: str
    suggestions: List[str]
    improved_draft: str
    mode: Literal["llm", "heuristic"]
    model: Optional[str] = None

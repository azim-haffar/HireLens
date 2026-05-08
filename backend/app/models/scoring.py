from pydantic import BaseModel
from typing import Literal, Optional


class ATSRule(BaseModel):
    rule: str
    passed: bool
    severity: Literal["critical", "warning", "info"]
    suggestion: str


class ATSResult(BaseModel):
    score: int
    rules: list[ATSRule]
    summary: str


class MatchBreakdown(BaseModel):
    skill_fit: float
    experience: float
    education: float
    keyword_coverage: float


class MatchResult(BaseModel):
    score: int
    breakdown: MatchBreakdown
    matched_skills: list[str]
    missing_skills: list[str]


class RoastBreakdown(BaseModel):
    category: str
    score: int
    feedback: str


class RoastResult(BaseModel):
    overall_score: int
    breakdown: list[RoastBreakdown]
    positive: str
    brutal_feedback: str


class DeepATSRule(BaseModel):
    id: str
    category: str
    name: str
    status: Literal["pass", "warning", "fail"]
    severity: Literal["critical", "warning", "info"]
    score: int
    message: str
    fix: str
    example: str


class DeepATSResult(BaseModel):
    overall_score: int
    grade: Literal["A", "B", "C", "D", "F"]
    summary: str
    rules: list[DeepATSRule]
    top_fixes: list[DeepATSRule]

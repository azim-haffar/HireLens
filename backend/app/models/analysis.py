from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ATSIssue(BaseModel):
    rule: str
    severity: str  # critical, warning, info
    description: str
    suggestion: str


class ATSReport(BaseModel):
    score: int  # 0-100
    issues: list[ATSIssue]
    passed_checks: list[str]
    overall_assessment: str


class SkillMatch(BaseModel):
    skill: str
    matched: bool
    context: Optional[str] = None


class ScoreResult(BaseModel):
    overall_score: int  # 0-100
    verdict: str  # strong / moderate / weak / rejected
    verdict_color: str  # green / yellow / orange / red
    matched_skills: list[str]
    missing_skills: list[str]
    skill_match_score: int
    experience_score: int
    education_score: int
    keyword_score: int
    reasons: list[str]
    recommendations: list[str]


class InterviewQuestion(BaseModel):
    question: str
    category: str  # technical / behavioral / situational
    difficulty: str  # easy / medium / hard
    suggested_answer: str
    why_asked: str


class AnalysisRequest(BaseModel):
    cv_id: str
    job_id: str


class AnalysisResponse(BaseModel):
    id: str
    cv_id: str
    job_id: str
    ats_report: dict
    score_result: dict
    interview_questions: list[dict]
    cover_letter: Optional[str] = None
    created_at: datetime


class CompareRequest(BaseModel):
    cv_id_v1: str
    cv_id_v2: str
    job_id: str


class CompareResponse(BaseModel):
    v1_score: ScoreResult
    v2_score: ScoreResult
    improvement_areas: list[str]
    summary: str

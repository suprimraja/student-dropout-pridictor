from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(student|faculty)$")
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str


class StudentInput(BaseModel):
    full_name: str = "Student"
    age: int = 17
    gender: str = "unspecified"
    study_hours: float = Field(ge=0, le=16)
    attendance: float = Field(ge=0, le=100)
    physics_score: float = Field(ge=0, le=100)
    chemistry_score: float = Field(ge=0, le=100)
    math_score: float = Field(ge=0, le=100)
    fee_status: bool = True
    parent_contact: str = ""
    course: str = "JEE Foundation"


class StudentOut(StudentInput):
    id: int
    user_id: int
    updated_at: datetime

    class Config:
        from_attributes = True


class PredictionRequest(StudentInput):
    model_name: str = "catboost"


class FeatureImpact(BaseModel):
    feature: str
    value: float | str | bool
    impact: float
    direction: str
    advice: str


class PredictionOut(BaseModel):
    probability: float
    risk_level: str
    performance_score: float
    top_features: list[FeatureImpact]
    suggestions: list[str]
    warning: str | None = None
    model_name: str


class ChatRequest(BaseModel):
    message: str
    student_id: int | None = None
    history: list[dict[str, str]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    provider: str = "local"


class BulkStudentAnalysis(BaseModel):
    row_number: int
    full_name: str
    study_hours: float
    attendance: float
    physics_score: float
    chemistry_score: float
    math_score: float
    probability: float
    risk_level: str
    performance_score: float
    top_driver: str
    suggestions: list[str]


class BulkAnalysisResponse(BaseModel):
    total_students: int
    high_risk: int
    medium_risk: int
    low_risk: int
    average_probability: float
    average_performance: float
    recommended_actions: list[str]
    students: list[BulkStudentAnalysis]


class MessageCreate(BaseModel):
    receiver_id: int
    message: str


class InterventionCreate(BaseModel):
    student_id: int
    action: str = Field(min_length=3, max_length=160)
    notes: str = Field(default="", max_length=600)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

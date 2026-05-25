from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AssigneeSummary(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    priority: Optional[str] = "medium"
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigned_to: Optional[int]
    created_by: int
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    assignee: Optional[AssigneeSummary] = None

    class Config:
        from_attributes = True


def task_to_response(task) -> TaskResponse:
    data = TaskResponse.model_validate(task)
    if task.assignee:
        data.assignee = AssigneeSummary.model_validate(task.assignee)
    return data

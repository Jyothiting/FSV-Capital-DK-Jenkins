from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Task, User
from schemas.task import TaskCreate, TaskUpdate, TaskResponse, task_to_response
from middleware.auth_middleware import get_current_active_user, RequireRole
from middleware.activity_logger import log_activity

router = APIRouter(prefix="/tasks", tags=["Task Management"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    request: Request,
    current_user: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin creates a new task."""
    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        assigned_to=task_in.assigned_to,
        due_date=task_in.due_date,
        created_by=current_user.id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    log_activity(
        db,
        current_user.id,
        "task_create",
        f"Created task: {new_task.title}",
        request,
    )

    task = db.query(Task).options(joinedload(Task.assignee)).filter(Task.id == new_task.id).first()
    return task_to_response(task)

@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    skip: int = Query(0, description="Pagination offset"),
    limit: int = Query(100, description="Pagination limit"),
    status: Optional[str] = Query(None, description="Filter by status (pending, in_progress, completed)"),
    assigned_to: Optional[int] = Query(None, description="Filter by assignee user ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List tasks with dynamic filtering API and pagination."""
    query = db.query(Task).options(joinedload(Task.assignee))

    # If standard user, only show their assigned tasks
    if current_user.role.name == "user":
        query = query.filter(Task.assigned_to == current_user.id)
    else:
        # Admin can filter by assigned_to
        if assigned_to is not None:
            query = query.filter(Task.assigned_to == assigned_to)
            
    # Dynamic Filtering
    if status is not None:
        query = query.filter(Task.status == status)
        
    tasks = query.offset(skip).limit(limit).all()
    return [task_to_response(t) for t in tasks]

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """User updates task status. Admin can update anything."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Permission check: Users can only update tasks assigned to them
    if current_user.role.name == "user" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    # If standard user, they can ONLY update status
    update_data = task_update.model_dump(exclude_unset=True)
    if current_user.role.name == "user":
        allowed_updates = ["status"]
        update_data = {k: v for k, v in update_data.items() if k in allowed_updates}

    # Track completion date
    if update_data.get("status") == "completed" and task.status != "completed":
        task.completed_at = datetime.utcnow()
    elif update_data.get("status") in ["pending", "in_progress"]:
        task.completed_at = None

    for key, value in update_data.items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    task = db.query(Task).options(joinedload(Task.assignee)).filter(Task.id == task_id).first()

    log_activity(db, current_user.id, "task_update", f"Updated task {task.id} to status: {task.status}", request)

    return task_to_response(task)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Task, ActivityLog, StartupApplication, User
from middleware.auth_middleware import RequireRole, get_current_active_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/")
def get_analytics(current_admin: User = Depends(RequireRole("admin")), db: Session = Depends(get_db)):
    """Admin dashboard analytics."""
    
    # Task Stats
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    pending_tasks = total_tasks - completed_tasks
    
    # Application Stats
    total_applications = db.query(StartupApplication).count()
    avg_score = db.query(func.avg(StartupApplication.deal_score)).scalar() or 0.0
    
    # Most searched queries (from Activity Logs where action='search')
    searches = db.query(
        ActivityLog.details, func.count(ActivityLog.id).label("count")
    ).filter(
        ActivityLog.action == "search"
    ).group_by(
        ActivityLog.details
    ).order_by(
        func.count(ActivityLog.id).desc()
    ).limit(5).all()
    
    top_searches = [{"query": s[0].replace("Query: ", ""), "count": s[1]} for s in searches if s[0]]

    # Applications by status (for stage bar)
    status_counts = {}
    for status_val in ["Submitted", "Under Review", "Accepted", "Rejected"]:
        status_counts[status_val] = db.query(StartupApplication).filter(
            StartupApplication.status == status_val
        ).count()

    return {
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": pending_tasks
        },
        "applications": {
            "total": total_applications,
            "average_deal_score": round(avg_score, 2),
            "by_status": status_counts,
        },
        "top_searches": top_searches
    }


@router.get("/me", summary="User-scoped analytics")
@router.get("/me/", summary="User-scoped analytics", include_in_schema=False)
def get_my_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return analytics scoped to the authenticated user."""
    uid = current_user.id

    # Task breakdown for this user
    my_tasks = db.query(Task).filter(Task.assigned_to == uid)
    total      = my_tasks.count()
    completed  = my_tasks.filter(Task.status == "completed").count()
    in_progress = db.query(Task).filter(Task.assigned_to == uid, Task.status == "in_progress").count()
    pending    = db.query(Task).filter(Task.assigned_to == uid, Task.status == "pending").count()

    # Search count for this user
    search_count = db.query(ActivityLog).filter(
        ActivityLog.user_id == uid,
        ActivityLog.action == "search"
    ).count()

    # Most recent activity entries (last 5)
    recent = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == uid)
        .order_by(ActivityLog.created_at.desc())
        .limit(5)
        .all()
    )
    recent_activity = [
        {
            "id":         r.id,
            "action":     r.action,
            "details":    r.details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent
    ]

    # Own application status (most recent)
    app = (
        db.query(StartupApplication)
        .filter(StartupApplication.contact_email == current_user.email)
        .order_by(StartupApplication.created_at.desc())
        .first()
    )
    application = None
    if app:
        application = {
            "id":                    app.id,
            "startup_name":          app.startup_name,
            "website_url":           app.website_url,
            "founder_names":         app.founder_names,
            "contact_email":         app.contact_email,
            "contact_number":        app.contact_number,
            "linkedin_founder":      app.linkedin_founder,
            "linkedin_company":      app.linkedin_company,
            "linkedin_profile":      app.linkedin_profile,
            "hq_location":           app.hq_location,
            "year_of_incorporation": app.year_of_incorporation,
            "problem_statement":     app.problem_statement,
            "solution_overview":     app.solution_overview,
            "industry_sector":       app.industry_sector,
            "business_model":        app.business_model,
            "current_stage":         app.current_stage,
            "core_product_description": app.core_product_description,
            "technology_stack":      app.technology_stack,
            "unique_value_proposition": app.unique_value_proposition,
            "ip_patents":            app.ip_patents,
            "demo_link":             app.demo_link,
            "target_market":         app.target_market,
            "customer_segment":      app.customer_segment,
            "key_competitors":       app.key_competitors,
            "competitive_advantage": app.competitive_advantage,
            "current_revenue":       app.current_revenue,
            "growth_rate":           app.growth_rate,
            "number_of_customers":   app.number_of_customers,
            "key_partnerships":      app.key_partnerships,
            "notable_achievements":  app.notable_achievements,
            "funding_raised_till_date": app.funding_raised_till_date,
            "investors":             app.investors,
            "burn_rate":             app.burn_rate,
            "runway_months":         app.runway_months,
            "revenue_projections":    app.revenue_projections,
            "amount_raising":        app.amount_raising,
            "funding_stage":         app.funding_stage,
            "equity_offered":        app.equity_offered,
            "use_of_funds":          app.use_of_funds,
            "founder_background":     app.founder_background,
            "core_team_members":     app.core_team_members,
            "advisors_mentors":      app.advisors_mentors,
            "why_partner":           app.why_partner,
            "how_add_value":         app.how_add_value,
            "open_to_mentorship":    app.open_to_mentorship,
            "pitch_deck_path":       app.pitch_deck_path,
            "financial_model_path":  app.financial_model_path,
            "additional_documents_path": app.additional_documents_path,
            "company_registered":    app.company_registered,
            "legal_issues":          app.legal_issues,
            "consent_given":         app.consent_given,
            "deal_score":            round(app.deal_score or 0, 1),
            "status":                app.status,
            "reviewer_id":           app.reviewer_id,
            "reviewer_notes":        app.reviewer_notes,
            "submitted_at":          app.created_at.isoformat() if app.created_at else None,
            "created_at":            app.created_at.isoformat() if app.created_at else None,
            "updated_at":            app.updated_at.isoformat() if app.updated_at else None,
        }

    return {
        "tasks": {
            "total":       total,
            "completed":   completed,
            "in_progress": in_progress,
            "pending":     pending,
        },
        "search_count":    search_count,
        "recent_activity": recent_activity,
        "application":     application,
    }

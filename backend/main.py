from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai_analyst import analyze_scan_with_ai
from backend.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.database import Base, engine, get_db
from backend.models import Project, Scan, User
from backend.security_engine import run_basic_assessment


# ============================================================
# Database initialization
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="CyberGuard AI API",
    description=(
        "AI-powered authorized web security "
        "assessment platform."
    ),
    version="0.8.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://cyber-guard-ai-gamma.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Request Models
# ============================================================


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ScanRequest(BaseModel):
    target_url: HttpUrl
    scan_type: Literal["basic"] = "basic"
    authorized: bool
    project_id: int | None = None


class ProjectCreateRequest(BaseModel):
    name: str
    description: str | None = None
    target_url: HttpUrl


class ProjectUpdateRequest(BaseModel):
    name: str
    description: str | None = None
    target_url: HttpUrl


# ============================================================
# Root / Health
# ============================================================


@app.get("/")
def root():
    return {
        "message": "CyberGuard AI API is running.",
        "version": "0.8.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


# ============================================================
# Authentication
# ============================================================


@app.post("/auth/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = request.email.strip().lower()

    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Password must be at least "
                "8 characters long."
            ),
        )

    existing_user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email "
                "already exists."
            ),
        )

    user = User(
        email=email,
        password_hash=hash_password(
            request.password
        ),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful.",
        "user": {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at,
        },
    }


@app.post("/auth/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    email = request.email.strip().lower()

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if user is None or not verify_password(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get("/auth/me")
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }


# ============================================================
# Security Scan
# ============================================================


@app.post("/scan")
def scan_target(
    request: ScanRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Authorization check
    # --------------------------------------------------------

    if not request.authorized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Authorization confirmation is required. "
                "Only scan systems you own or have explicit "
                "permission to assess."
            ),
        )

    # --------------------------------------------------------
    # Scan type validation
    # --------------------------------------------------------

    if request.scan_type != "basic":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only basic scans are currently supported."
            ),
        )

    # --------------------------------------------------------
    # Project ownership validation
    # --------------------------------------------------------

    project = None

    if request.project_id is not None:
        project = db.scalar(
            select(Project).where(
                Project.id == request.project_id,
                Project.user_id == current_user.id,
            )
        )

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )

    # --------------------------------------------------------
    # Target URL
    # --------------------------------------------------------

    target_url = str(request.target_url)

    # --------------------------------------------------------
    # Run security assessment
    # --------------------------------------------------------

    try:
        result = run_basic_assessment(
            target_url
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            f"Security scan error: {exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The target could not be assessed safely. "
                "Verify the target URL and try again."
            ),
        ) from exc

    # --------------------------------------------------------
    # Save scan in database
    # --------------------------------------------------------

    scan_record = Scan(
        user_id=current_user.id,
        project_id=request.project_id,
        target=result["target"],
        scan_type=request.scan_type,
        status=result["status"],
        security_score=result.get(
            "security_score"
        ),
        http_status=result.get(
            "http_status"
        ),
        findings=result.get(
            "findings",
            [],
        ),
        category_scores=result.get(
            "category_scores",
            {},
        ),
        ai_analysis=None,
    )

    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)

    # --------------------------------------------------------
    # Return scan result
    # --------------------------------------------------------

    return {
        "scan_id": scan_record.id,
        "project_id": scan_record.project_id,
        "status": scan_record.status,
        "target": scan_record.target,
        "http_status": scan_record.http_status,
        "security_score": (
            scan_record.security_score
        ),
        "category_scores": (
            scan_record.category_scores
        ),
        "findings": scan_record.findings,
        "ai_analysis": scan_record.ai_analysis,
        "message": result.get(
            "message"
        ),
    }


# ============================================================
# Scan History
# ============================================================


@app.get("/scans")
def get_scans(
    project_id: int | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Base query: only current user's scans
    # --------------------------------------------------------

    query = select(Scan).where(
        Scan.user_id == current_user.id
    )

    # --------------------------------------------------------
    # Optional project filter
    # --------------------------------------------------------

    if project_id is not None:
        project = db.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.user_id == current_user.id,
            )
        )

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )

        query = query.where(
            Scan.project_id == project_id
        )

    # --------------------------------------------------------
    # Get scans
    # --------------------------------------------------------

    scans = db.scalars(
        query.order_by(
            Scan.created_at.desc()
        )
    ).all()

    return [
        {
            "id": scan.id,
            "project_id": scan.project_id,
            "target": scan.target,
            "scan_type": scan.scan_type,
            "status": scan.status,
            "security_score": scan.security_score,
            "http_status": scan.http_status,
            "category_scores": scan.category_scores,
            "findings": scan.findings,
            "ai_analysis": scan.ai_analysis,
            "created_at": scan.created_at,
        }
        for scan in scans
    ]


# ============================================================
# Individual Scan
# ============================================================


@app.get("/scans/{scan_id}")
def get_scan(
    scan_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    scan = db.scalar(
        select(Scan).where(
            Scan.id == scan_id,
            Scan.user_id == current_user.id,
        )
    )

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found.",
        )

    return {
        "id": scan.id,
        "project_id": scan.project_id,
        "target": scan.target,
        "scan_type": scan.scan_type,
        "status": scan.status,
        "security_score": (
            scan.security_score
        ),
        "http_status": (
            scan.http_status
        ),
        "category_scores": scan.category_scores,
        "findings": scan.findings,
        "ai_analysis": scan.ai_analysis,
        "created_at": scan.created_at,
    }


# ============================================================
# AI Security Analysis
# ============================================================


@app.post("/scans/{scan_id}/analyze")
def analyze_scan(
    scan_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Find scan belonging to current user
    # --------------------------------------------------------

    scan = db.scalar(
        select(Scan).where(
            Scan.id == scan_id,
            Scan.user_id == current_user.id,
        )
    )

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found.",
        )

    # --------------------------------------------------------
    # Return existing AI analysis if already generated
    # --------------------------------------------------------

    if scan.ai_analysis:
        return {
            "scan_id": scan.id,
            "model": "AI Security Analyst",
            "analysis": scan.ai_analysis,
            "cached": True,
        }

    # --------------------------------------------------------
    # Send scanner findings to Gemini
    # --------------------------------------------------------

    try:
        analysis = analyze_scan_with_ai(
            target=scan.target,
            security_score=scan.security_score,
            findings=scan.findings,
        )

    except RuntimeError as exc:
        message = str(exc)

        # Gemini configuration error
        if "GEMINI_API_KEY" in message:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "AI analysis is not configured. "
                    "Add GEMINI_API_KEY to backend/.env."
                ),
            ) from exc

        # Other Gemini/API errors
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The AI security analysis could not "
                "be completed."
            ),
        ) from exc

    # --------------------------------------------------------
    # Save AI analysis to database
    # --------------------------------------------------------

    scan.ai_analysis = analysis.model_dump()

    db.commit()
    db.refresh(scan)

    # --------------------------------------------------------
    # Return saved AI analysis
    # --------------------------------------------------------

    return {
        "scan_id": scan.id,
        "model": "AI Security Analyst",
        "analysis": scan.ai_analysis,
        "cached": False,
    }


# ============================================================
# Delete One Scan
# ============================================================


@app.delete("/scans/{scan_id}")
def delete_scan(
    scan_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    scan = db.scalar(
        select(Scan).where(
            Scan.id == scan_id,
            Scan.user_id == current_user.id,
        )
    )

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found.",
        )

    db.delete(scan)
    db.commit()

    return {
        "message": "Scan deleted successfully.",
    }


# ============================================================
# Delete All Scans
# ============================================================


@app.delete("/scans")
def delete_all_scans(
    project_id: int | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Base query
    # --------------------------------------------------------

    query = select(Scan).where(
        Scan.user_id == current_user.id
    )

    # --------------------------------------------------------
    # Optional project filter
    # --------------------------------------------------------

    if project_id is not None:
        project = db.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.user_id == current_user.id,
            )
        )

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found.",
            )

        query = query.where(
            Scan.project_id == project_id
        )

    # --------------------------------------------------------
    # Delete matching scans
    # --------------------------------------------------------

    scans = db.scalars(query).all()

    deleted_count = len(scans)

    for scan in scans:
        db.delete(scan)

    db.commit()

    return {
        "message": "Scans deleted successfully.",
        "deleted_count": deleted_count,
    }


# ============================================================
# PROJECT ENDPOINTS
# ============================================================


# ------------------------------------------------------------
# Create Project
# ------------------------------------------------------------


@app.post("/projects")
def create_project(
    request: ProjectCreateRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    name = request.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name cannot be empty.",
        )

    project = Project(
        user_id=current_user.id,
        name=name,
        description=(
            request.description.strip()
            if request.description
            else None
        ),
        target_url=str(
            request.target_url
        ),
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "target_url": project.target_url,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


# ------------------------------------------------------------
# Get Projects
# ------------------------------------------------------------


@app.get("/projects")
def get_projects(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    projects = db.scalars(
        select(Project)
        .where(
            Project.user_id == current_user.id
        )
        .order_by(
            Project.created_at.desc()
        )
    ).all()

    return [
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "target_url": project.target_url,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        }
        for project in projects
    ]


# ------------------------------------------------------------
# Get Single Project
# ------------------------------------------------------------


@app.get("/projects/{project_id}")
def get_project(
    project_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "target_url": project.target_url,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


# ------------------------------------------------------------
# Update Project
# ------------------------------------------------------------


@app.put("/projects/{project_id}")
def update_project(
    project_id: int,
    request: ProjectUpdateRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    name = request.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name cannot be empty.",
        )

    project.name = name

    project.description = (
        request.description.strip()
        if request.description
        else None
    )

    project.target_url = str(
        request.target_url
    )

    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "target_url": project.target_url,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


# ------------------------------------------------------------
# Delete Project
# ------------------------------------------------------------


@app.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    db.delete(project)
    db.commit()

    return {
        "message": "Project deleted successfully.",
        "project_id": project_id,
    }
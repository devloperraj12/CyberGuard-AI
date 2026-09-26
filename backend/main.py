from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_analyst import analyze_scan_with_ai
from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import Base, engine, get_db
from models import Scan, User
from security_engine import run_basic_assessment


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="CyberGuard AI API",
    description=(
        "AI-powered authorized web security "
        "assessment platform."
    ),
    version="0.6.0",
)


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


@app.get("/")
def root():
    return {
        "message": "CyberGuard AI API is running.",
        "version": "0.6.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


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


@app.post("/scan")
def scan_target(
    request: ScanRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if not request.authorized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Authorization confirmation is required. "
                "Only scan systems you own or have explicit "
                "permission to assess."
            ),
        )

    if request.scan_type != "basic":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only basic scans are currently supported."
            ),
        )

    target_url = str(request.target_url)

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

    scan_record = Scan(
        user_id=current_user.id,
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
    )

    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)

    return {
        "scan_id": scan_record.id,
        "status": scan_record.status,
        "target": scan_record.target,
        "http_status": scan_record.http_status,
        "security_score": (
            scan_record.security_score
        ),
        "findings": scan_record.findings,
        "message": result.get(
            "message"
        ),
    }


@app.get("/scans")
def get_scans(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    scans = db.scalars(
        select(Scan)
        .where(
            Scan.user_id == current_user.id
        )
        .order_by(
            Scan.created_at.desc()
        )
    ).all()

    return [
        {
            "id": scan.id,
            "target": scan.target,
            "scan_type": scan.scan_type,
            "status": scan.status,
            "security_score": (
                scan.security_score
            ),
            "http_status": (
                scan.http_status
            ),
            "findings": scan.findings,
            "created_at": scan.created_at,
        }
        for scan in scans
    ]


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
        "target": scan.target,
        "scan_type": scan.scan_type,
        "status": scan.status,
        "security_score": (
            scan.security_score
        ),
        "http_status": (
            scan.http_status
        ),
        "findings": scan.findings,
        "created_at": scan.created_at,
    }


@app.post("/scans/{scan_id}/analyze")
def analyze_scan(
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

    try:
        analysis = analyze_scan_with_ai(
            target=scan.target,
            security_score=(
                scan.security_score
            ),
            findings=scan.findings,
        )

    except RuntimeError as exc:
        message = str(exc)

        if (
            "OPENAI_API_KEY"
            in message
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "AI analysis is not configured. "
                    "Add OPENAI_API_KEY to backend/.env."
                ),
            ) from exc

        raise HTTPException(
            status_code=502,
            detail=(
                "The AI security analysis could not "
                "be completed."
            ),
        ) from exc

    return {
        "scan_id": scan.id,
        "model": (
            "AI Security Analyst"
        ),
        "analysis": analysis.model_dump(),
    }


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


@app.delete("/scans")
def delete_all_scans(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    scans = db.scalars(
        select(Scan).where(
            Scan.user_id == current_user.id
        )
    ).all()

    for scan in scans:
        db.delete(scan)

    db.commit()

    return {
        "message": (
            "All scans deleted successfully."
        ),
        "deleted_count": len(scans),
    }
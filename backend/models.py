from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # User → Scans
    scans: Mapped[list["Scan"]] = relationship(
        "Scan",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # User → Projects
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    target_url: Mapped[str] = mapped_column(
        String(2048),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Project → User
    user: Mapped["User"] = relationship(
        "User",
        back_populates="projects",
    )

    # Project → Scans
    scans: Mapped[list["Scan"]] = relationship(
        "Scan",
        back_populates="project",
    )


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # Project association.
    #
    # Nullable for now so existing scans continue
    # working while we migrate them into projects.
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"),
        nullable=True,
        index=True,
    )

    target: Mapped[str] = mapped_column(
        String(2048),
        nullable=False,
    )

    scan_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    security_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    http_status: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    findings: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Category-based security scores.
    # Example:
    # {
    #     "Security Headers": 50,
    #     "Transport Security": 100,
    #     "Cookie Security": 100,
    #     "Network Exposure": 100,
    #     "DNS Security": 100,
    #     "Information Disclosure": 100,
    #     "CORS": 100,
    #     "HTTP Methods": 100
    # }
    category_scores: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # AI-generated analysis is stored with the scan.
    ai_analysis: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Scan → User
    user: Mapped["User"] = relationship(
        "User",
        back_populates="scans",
    )

    # Scan → Project
    project: Mapped["Project | None"] = relationship(
        "Project",
        back_populates="scans",
    )
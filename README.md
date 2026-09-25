# CyberGuard AI

**AI-Powered Authorized Web Security Assessment Platform**

CyberGuard AI is a full-stack cybersecurity platform for performing **authorized, non-destructive web security assessments** and turning technical findings into understandable remediation guidance with an AI security analyst.

The application combines a **Next.js frontend**, **FastAPI backend**, **PostgreSQL database**, deterministic security checks, JWT authentication, Docker-based deployment, and **Google Gemini** for AI-assisted analysis.

> **Important:** CyberGuard AI is intended only for websites and systems that you own or have explicit permission to assess. It is designed for safe assessment and does not attempt exploitation or destructive testing.

---

## Features

### Security Assessment

- HTTP/HTTPS security assessment
- Security header checks
  - Strict-Transport-Security (HSTS)
  - Content-Security-Policy (CSP)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
- HTTPS and TLS checks
- Certificate validity information
- Cookie security checks
- Server and technology information disclosure checks
- CORS configuration checks
- HTTP method checks and TRACE detection
- Safe redirect validation
- SSRF-resistant target validation
- Deterministic security scoring

### AI Security Analyst

CyberGuard AI sends the existing scan findings to Google Gemini and generates:

- Executive summary
- Risk explanations
- Prioritized remediation actions
- Additional security observations

The AI layer **does not change the underlying scanner score**. It explains and prioritizes findings produced by the security engine.

### Authentication & Scan History

- User registration and login
- JWT-based authentication
- Password hashing with Argon2 through `pwdlib`
- Protected API endpoints
- Per-user scan ownership
- Scan history
- Individual scan reports
- Scan deletion

### Development & Deployment

- Dockerized frontend, backend, and PostgreSQL
- Docker Compose orchestration
- Environment-variable based secret management
- Configurable frontend API URL
- PostgreSQL persistence

---

## Architecture

```text
                    ┌──────────────────────┐
                    │       Browser        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Next.js + TypeScript  │
                    │      Frontend         │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │       FastAPI         │
                    │       Backend         │
                    └──────┬───────┬───────┘
                           │       │
                ┌──────────┘       └─────────────┐
                ▼                                ▼
      ┌────────────────────┐          ┌────────────────────┐
      │  Security Engine   │          │   AI Security      │
      │ Python / HTTPX     │          │   Analyst / Gemini │
      └──────────┬─────────┘          └──────────┬─────────┘
                 │                               │
                 └──────────────┬────────────────┘
                                ▼
                     ┌────────────────────┐
                     │    PostgreSQL      │
                     │ Users + Scan Data  │
                     └────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 18 |
| ORM / DB Access | SQLAlchemy + Psycopg |
| Authentication | JWT + Argon2 password hashing |
| HTTP Client | HTTPX |
| AI | Google Gemini API |
| Containerization | Docker + Docker Compose |
| Version Control | Git + GitHub |

---

## Project Structure

```text
CyberGuard-AI/
│
├── backend/
│   ├── ai_analyst.py
│   ├── auth.py
│   ├── create_tables.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── security_engine.py
│   ├── test_auth.py
│   ├── test_database.py
│   ├── test_security_engine.py
│   ├── update_scan_ownership.py
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── history/
│   │   ├── login/
│   │   ├── register/
│   │   ├── scan/
│   │   └── scan/[id]/
│   ├── components/
│   │   └── AuthGuard.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   └── config.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── next.config.ts
│   ├── package.json
│   └── package-lock.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Security Model

CyberGuard AI is designed around safe assessment rather than exploitation.

### Target Validation

The backend validates scan targets before making requests and rejects unsafe destinations such as:

- localhost / loopback addresses
- private network addresses
- link-local addresses
- multicast and reserved addresses
- unspecified addresses
- URLs containing embedded credentials
- unsupported URL schemes

DNS resolution is also checked so a hostname cannot simply bypass the IP-based validation.

### Redirect Protection

Redirects are handled explicitly instead of blindly following them. Each redirect destination is validated before another request is made, with a bounded redirect count.

### Authentication

Protected application endpoints require a valid JWT. Passwords are stored as password hashes rather than plaintext values.

### Secret Management

Secrets are stored in environment variables and excluded from Git through `.gitignore`.

Never commit:

```text
backend/.env
frontend/.env.local
API keys
JWT signing secrets
Database passwords
```

Use the provided example environment file as a template instead.

---

## Local Development

### Prerequisites

Install:

- Node.js 22+
- Python 3.12+
- PostgreSQL 18+ (or use the Docker database)
- Docker Desktop (recommended for the full stack)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/devloperraj12/CyberGuard-AI.git
cd CyberGuard-AI
```

### 2. Backend environment

Create `backend/.env` from the example file:

```text
DATABASE_URL=postgresql+psycopg://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/cyberguard
JWT_SECRET_KEY=YOUR_RANDOM_JWT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never commit the real `.env` file.

### 3. Run the backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 4. Run the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

The frontend API URL can be configured with:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Docker Setup

The repository includes a Docker Compose configuration for the complete stack.

From the project root:

```powershell
docker compose up --build
```

Services:

| Service | Local URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 |

Stop the stack:

```powershell
docker compose down
```

To stop the containers while keeping the database volume:

```powershell
docker compose down
```

---

## API Overview

### Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Scans

```text
POST   /scan
GET    /scans
GET    /scans/{scan_id}
POST   /scans/{scan_id}/analyze
DELETE /scans/{scan_id}
DELETE /scans
```

### Health Check

```text
GET /health
```

Interactive API documentation is available through FastAPI Swagger UI at `/docs`.

---

## Security Score

The current security score is a **project-specific deterministic score**, not an industry-standard certification or benchmark.

Findings contribute penalties based on their severity, while informational findings do not reduce the score.

The score is intended to provide a consistent way to summarize the findings generated by the current security engine.

---

## AI Analysis Flow

```text
Scan Result
    │
    ▼
Security Findings
    │
    ▼
FastAPI /scans/{id}/analyze
    │
    ▼
Google Gemini
    │
    ▼
Structured Security Analysis
    ├── Executive Summary
    ├── Risk Explanations
    ├── Prioritized Actions
    └── Observations
```

The AI analyst provides interpretation and remediation guidance based on the collected findings. It is not a replacement for a professional penetration test or security audit.

---

## Testing

The backend includes tests for authentication, database behavior, and security-engine validation.

Example:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python test_auth.py
python test_database.py
python test_security_engine.py
```

The security engine includes tests for safe and unsafe target handling, including private/loopback targets and redirect validation.

---

## Screenshots

Screenshots can be added here for the final portfolio presentation.

Suggested screenshots:

1. Login / registration
2. Dashboard
3. New security scan
4. Scan report
5. AI Security Analyst panel
6. Scan history

---

## Roadmap

Planned improvements can include:

- More passive security checks
- Background scan jobs and progress tracking
- Richer report export
- Rate limiting and stronger abuse controls
- Role-based access control
- Improved observability and audit logs
- Cloud deployment
- CI/CD automation

These items are roadmap ideas and are not represented as currently implemented features.

---

## Responsible Use

CyberGuard AI should only be used against systems for which you have authorization.

Do not use the platform to:

- scan third-party systems without permission
- attempt exploitation
- perform destructive testing
- bypass access controls
- launch denial-of-service activity

Use dedicated training environments such as intentionally vulnerable labs for offensive-security practice.

---

## Author

**Raj Kumar Sah**

Computer Science & Engineering | Full-Stack Development | Cybersecurity | AI

GitHub: https://github.com/devloperraj12

Project: https://github.com/devloperraj12/CyberGuard-AI

---

## License

Add the project's chosen license before public production distribution. The repository currently does not declare a license.

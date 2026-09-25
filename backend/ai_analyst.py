import os
from typing import Any

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field


load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.8-flash",
)


class RiskExplanation(BaseModel):
    finding: str
    why_it_matters: str
    severity: str


class PrioritizedAction(BaseModel):
    priority: str
    action: str
    reason: str


class SecurityAnalysis(BaseModel):
    executive_summary: str
    risk_explanations: list[RiskExplanation] = Field(
        default_factory=list
    )
    prioritized_actions: list[PrioritizedAction] = Field(
        default_factory=list
    )
    observations: list[str] = Field(
        default_factory=list
    )


SYSTEM_PROMPT = """
You are the AI Security Analyst for CyberGuard AI.

Your job is to explain findings produced by a deterministic,
non-destructive web security scanner.

Rules:

1. Do not invent vulnerabilities.
2. Do not create findings that are not present in the supplied
   scanner findings.
3. Do not change the scanner's security score.
4. Treat scanner severity values as the source of truth.
5. Explain why existing findings matter in practical terms.
6. Provide realistic remediation guidance.
7. Prioritize existing findings by urgency.
8. Do not exaggerate informational observations.
9. Do not recommend exploitation or destructive testing.
10. Keep the explanation understandable for software developers.
11. Base the analysis on the supplied scanner evidence.
"""


def analyze_scan_with_ai(
    *,
    target: str,
    security_score: int | None,
    findings: list[dict[str, Any]],
) -> SecurityAnalysis:
    """
    Analyze existing CyberGuard AI findings using Gemini.

    The AI explains findings and prioritizes remediation.
    It does not calculate or modify the security score.
    """

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    client = genai.Client(
        api_key=GEMINI_API_KEY
    )

    scanner_summary = {
        "target": target,
        "security_score": security_score,
        "findings": findings,
    }

    prompt = f"""
Analyze the following CyberGuard AI security assessment.

Target:
{target}

Security score:
{security_score}

Scanner findings:
{scanner_summary}

Return a concise but useful security analysis for a software
developer.

The analysis must explain the supplied findings only.

Include:
- an executive summary
- why important findings matter
- prioritized remediation actions
- useful observations

Do not invent findings.
Do not change the score.
"""

    try:
        interaction = client.interactions.create(
            model=GEMINI_MODEL,
            input=(
                SYSTEM_PROMPT
                + "\n\n"
                + prompt
            ),
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": SecurityAnalysis.model_json_schema(),
            },
        )

    except Exception as exc:
        raise RuntimeError(
            f"Gemini API request failed: {exc}"
        ) from exc

    output_text = getattr(
        interaction,
        "output_text",
        None,
    )

    if not output_text:
        raise RuntimeError(
            "Gemini returned no usable analysis."
        )

    try:
        return SecurityAnalysis.model_validate_json(
            output_text
        )
    except Exception as exc:
        raise RuntimeError(
            "Gemini returned an unexpected analysis format."
        ) from exc
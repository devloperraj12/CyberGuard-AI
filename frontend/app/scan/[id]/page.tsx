"use client";
import { API_BASE_URL } from "../../../lib/config";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  clearAuth,
  getAuthHeaders,
} from "../../../lib/auth";

type Finding = {
  severity: string;
  title: string;
  description: string;
  recommendation?: string;
};

type Scan = {
  id: number;
  target: string;
  scan_type: string;
  status: string;
  security_score: number | null;
  http_status: number | null;
  findings: Finding[];
  created_at: string;
};

type RiskExplanation = {
  finding: string;
  why_it_matters: string;
  severity: string;
};

type PrioritizedAction = {
  priority: string;
  action: string;
  reason: string;
};

type AIAnalysis = {
  executive_summary: string;
  risk_explanations: RiskExplanation[];
  prioritized_actions: PrioritizedAction[];
  observations: string[];
};

export default function ScanReportPage() {
  const params = useParams();

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiAnalysis, setAiAnalysis] =
    useState<AIAnalysis | null>(null);

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiError, setAiError] =
    useState("");

  const [aiGenerated, setAiGenerated] =
    useState(false);

  useEffect(() => {
    const rawId = params?.id;

    const scanId = Array.isArray(rawId)
      ? rawId[0]
      : rawId;

    if (!scanId) {
      setError("Invalid scan ID.");
      setLoading(false);
      return;
    }

    loadScan(scanId);
  }, [params]);

  async function loadScan(scanId: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/scans/${scanId}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (response.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      if (response.status === 404) {
        throw new Error("Scan not found.");
      }

      if (!response.ok) {
        throw new Error(
          "Unable to load this security report."
        );
      }

      const data = await response.json();

      setScan(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load the security report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateAIAnalysis() {
    if (!scan) {
      return;
    }

    try {
      setAiLoading(true);
      setAiError("");

      const response = await fetch(
        `${API_BASE_URL}/scans/${scan.id}/analyze`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (response.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to generate AI security analysis."
        );
      }

      setAiAnalysis(data.analysis);
      setAiGenerated(true);
    } catch (err) {
      console.error(err);

      setAiError(
        err instanceof Error
          ? err.message
          : "Failed to generate AI security analysis."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  function getFindingCount(severity: string) {
    if (!scan?.findings) {
      return 0;
    }

    return scan.findings.filter(
      (finding) =>
        finding.severity?.toUpperCase() === severity
    ).length;
  }

  function getScoreLabel(score: number | null) {
    if (score === null) {
      return "Unavailable";
    }

    if (score >= 80) {
      return "Good";
    }

    if (score >= 60) {
      return "Moderate";
    }

    if (score >= 40) {
      return "Needs Attention";
    }

    return "Critical";
  }

  function getSeverityClasses(severity: string) {
    switch (severity.toUpperCase()) {
      case "HIGH":
        return "border-red-500/30 bg-red-500/5 text-red-400";

      case "MEDIUM":
        return "border-yellow-500/30 bg-yellow-500/5 text-yellow-400";

      case "LOW":
        return "border-blue-500/30 bg-blue-500/5 text-blue-400";

      default:
        return "border-slate-700 bg-slate-800/50 text-slate-300";
    }
  }

  function getPriorityClasses(priority: string) {
    switch (priority.toUpperCase()) {
      case "P1":
      case "CRITICAL":
      case "HIGH":
        return "border-red-500/30 bg-red-500/5 text-red-400";

      case "P2":
      case "MEDIUM":
        return "border-yellow-500/30 bg-yellow-500/5 text-yellow-400";

      default:
        return "border-cyan-500/30 bg-cyan-500/5 text-cyan-400";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/dashboard"
            className="text-2xl font-bold tracking-tight"
          >
            <span className="text-cyan-400">
              CyberGuard
            </span>{" "}
            <span className="text-white">AI</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
            >
              Dashboard
            </Link>

            <Link
              href="/scan"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
            >
              New Scan
            </Link>

            <Link
              href="/history"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
            >
              History
            </Link>

            <button
              onClick={() => {
                clearAuth();
                window.location.href = "/login";
              }}
              className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Security Report
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Scan Report
          </h1>

          <p className="mt-3 text-slate-400">
            Detailed results from your authorized security
            assessment.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="text-slate-400">
              Loading security report...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8">
            <h2 className="text-xl font-semibold text-red-400">
              Unable to load report
            </h2>

            <p className="mt-3 text-slate-400">
              {error}
            </p>

            <Link
              href="/history"
              className="mt-6 inline-block rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Back to History
            </Link>
          </div>
        )}

        {/* Report */}
        {!loading && !error && scan && (
          <div className="space-y-8">
            {/* Target + Score */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
              <p className="text-lg text-slate-400">
                Assessment target
              </p>

              <h2 className="mt-2 break-all text-3xl font-bold">
                {scan.target}
              </h2>

              <div className="mt-10">
                <p className="text-lg text-slate-400">
                  Security Score
                </p>

                <div className="mt-2 flex items-end gap-3">
                  <span
                    className={
                      scan.security_score !== null &&
                      scan.security_score >= 80
                        ? "text-7xl font-bold text-emerald-400"
                        : scan.security_score !== null &&
                            scan.security_score >= 60
                          ? "text-7xl font-bold text-yellow-400"
                          : "text-7xl font-bold text-red-400"
                    }
                  >
                    {scan.security_score ?? "N/A"}
                  </span>

                  <span className="pb-3 text-lg text-slate-500">
                    out of 100
                  </span>
                </div>

                <p className="mt-2 text-lg text-slate-400">
                  {getScoreLabel(
                    scan.security_score
                  )}
                </p>
              </div>
            </div>

            {/* Risk Summary */}
            <div>
              <h2 className="mb-6 text-3xl font-bold">
                Risk Summary
              </h2>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-7">
                  <p className="text-lg text-slate-400">
                    High Risk
                  </p>

                  <p className="mt-4 text-5xl font-bold text-red-400">
                    {getFindingCount("HIGH")}
                  </p>
                </div>

                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-7">
                  <p className="text-lg text-slate-400">
                    Medium Risk
                  </p>

                  <p className="mt-4 text-5xl font-bold text-yellow-400">
                    {getFindingCount("MEDIUM")}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-7">
                  <p className="text-lg text-slate-400">
                    Low Risk
                  </p>

                  <p className="mt-4 text-5xl font-bold text-blue-400">
                    {getFindingCount("LOW")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-7">
                  <p className="text-lg text-slate-400">
                    Informational
                  </p>

                  <p className="mt-4 text-5xl font-bold text-slate-200">
                    {getFindingCount("INFO")}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Security Analyst */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      AI
                    </span>

                    <h2 className="text-3xl font-bold">
                      AI Security Analyst
                    </h2>
                  </div>

                  <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                    Generate an AI explanation of the findings
                    already detected by CyberGuard AI. The AI
                    explains the scanner evidence and provides
                    prioritized remediation guidance.
                  </p>
                </div>

                <button
                  onClick={generateAIAnalysis}
                  disabled={aiLoading}
                  className="shrink-0 rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading
                    ? "Analyzing..."
                    : aiGenerated
                      ? "Regenerate Analysis"
                      : "Generate AI Analysis"}
                </button>
              </div>

              {/* AI error */}
              {aiError && (
                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
                  {aiError}
                </div>
              )}

              {/* AI result */}
              {aiAnalysis && (
                <div className="mt-8 space-y-6">
                  {/* Executive Summary */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                      Executive Summary
                    </p>

                    <p className="mt-4 leading-8 text-slate-300">
                      {aiAnalysis.executive_summary}
                    </p>
                  </div>

                  {/* Risk Explanations */}
                  <div>
                    <h3 className="mb-4 text-2xl font-bold">
                      Why These Findings Matter
                    </h3>

                    {aiAnalysis.risk_explanations.length ===
                    0 ? (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-5 text-slate-400">
                        No additional risk explanations
                        were returned.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {aiAnalysis.risk_explanations.map(
                          (item, index) => (
                            <div
                              key={`${item.finding}-${index}`}
                              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <h4 className="text-lg font-semibold">
                                  {item.finding}
                                </h4>

                                <span
                                  className={`rounded-lg border px-3 py-1 text-xs font-bold ${getSeverityClasses(
                                    item.severity
                                  )}`}
                                >
                                  {item.severity.toUpperCase()}
                                </span>
                              </div>

                              <p className="mt-3 leading-7 text-slate-400">
                                {item.why_it_matters}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Prioritized Actions */}
                  <div>
                    <h3 className="mb-4 text-2xl font-bold">
                      Prioritized Actions
                    </h3>

                    {aiAnalysis.prioritized_actions.length ===
                    0 ? (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-5 text-slate-400">
                        No prioritized actions were
                        returned.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {aiAnalysis.prioritized_actions.map(
                          (item, index) => (
                            <div
                              key={`${item.action}-${index}`}
                              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                <span
                                  className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold ${getPriorityClasses(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority}
                                </span>

                                <div>
                                  <h4 className="text-lg font-semibold">
                                    {item.action}
                                  </h4>

                                  <p className="mt-2 leading-7 text-slate-400">
                                    {item.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Observations */}
                  {aiAnalysis.observations.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-2xl font-bold">
                        Additional Observations
                      </h3>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                        <div className="space-y-3">
                          {aiAnalysis.observations.map(
                            (observation, index) => (
                              <div
                                key={index}
                                className="flex gap-3"
                              >
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />

                                <p className="leading-7 text-slate-400">
                                  {observation}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                    <p className="text-sm leading-6 text-slate-400">
                      AI analysis explains the scanner's existing
                      findings. It does not modify the security
                      score or create independent vulnerability
                      evidence.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Scan Information */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
              <h2 className="mb-8 text-3xl font-bold">
                Scan Information
              </h2>

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Scan ID
                  </p>

                  <p className="mt-3 text-lg font-semibold">
                    #{scan.id}
                  </p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Status
                  </p>

                  <p className="mt-3 text-lg font-semibold text-emerald-400">
                    {scan.status}
                  </p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Scan Type
                  </p>

                  <p className="mt-3 text-lg font-semibold capitalize">
                    {scan.scan_type}
                  </p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    HTTP Status
                  </p>

                  <p className="mt-3 text-lg font-semibold">
                    {scan.http_status ?? "N/A"}
                  </p>
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Scan Date
                  </p>

                  <p className="mt-3 text-lg font-semibold text-slate-300">
                    {formatDate(scan.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Findings */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold">
                  Security Findings
                </h2>

                <p className="mt-2 text-slate-400">
                  {scan.findings.length} finding
                  {scan.findings.length === 1
                    ? ""
                    : "s"} detected during this assessment.
                </p>
              </div>

              {scan.findings.length === 0 ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-400">
                  No findings were returned by this
                  assessment.
                </div>
              ) : (
                <div className="space-y-5">
                  {scan.findings.map(
                    (finding, index) => (
                      <div
                        key={`${finding.title}-${index}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold">
                              {finding.title}
                            </h3>

                            <p className="mt-3 leading-7 text-slate-400">
                              {finding.description}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold ${getSeverityClasses(
                              finding.severity
                            )}`}
                          >
                            {finding.severity.toUpperCase()}
                          </span>
                        </div>

                        {finding.recommendation && (
                          <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                              Recommendation
                            </p>

                            <p className="mt-2 leading-7 text-slate-300">
                              {finding.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/history"
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-400"
              >
                ← Back to History
              </Link>

              <Link
                href="/scan"
                className="rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Run New Scan
              </Link>
            </div>

            {/* Safety Notice */}
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
              <h3 className="font-semibold text-yellow-400">
                Authorized Security Testing
              </h3>

              <p className="mt-2 leading-7 text-slate-400">
                CyberGuard AI is designed for authorized,
                non-destructive security assessments. Only
                assess systems that you own or have explicit
                permission to test.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
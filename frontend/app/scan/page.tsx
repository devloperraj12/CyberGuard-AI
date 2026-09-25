"use client";
import { API_BASE_URL } from "../../lib/config";
import { FormEvent, useState } from "react";
import Link from "next/link";

import {
  clearAuth,
  getAuthHeaders,
} from "../../lib/auth";

type Finding = {
  severity: string;
  title: string;
  description: string;
  recommendation?: string;
};

type ScanResult = {
  scan_id: number;
  status: string;
  target: string;
  http_status: number | null;
  security_score: number | null;
  findings: Finding[];
  message?: string;
};

export default function ScanPage() {
  const [targetUrl, setTargetUrl] =
    useState("https://example.com");

  const [scanType, setScanType] =
    useState<"basic" | "extended">("basic");

  const [authorized, setAuthorized] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState<ScanResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!targetUrl.trim()) {
      setError("Please enter a target URL.");
      return;
    }

    if (!authorized) {
      setError(
        "Authorization confirmation is required before starting the assessment."
      );
      return;
    }

    if (scanType !== "basic") {
      setError(
        "Extended assessment is not available yet. Please use Basic Web Assessment."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            target_url: targetUrl.trim(),
            scan_type: scanType,
            authorized,
          }),
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
            "The security assessment could not be completed."
        );
      }

      setResult({
        scan_id: data.scan_id,
        status: data.status,
        target: data.target,
        http_status: data.http_status,
        security_score: data.security_score,
        findings: Array.isArray(data.findings)
          ? data.findings
          : [],
        message: data.message,
      });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete the security assessment."
      );
    } finally {
      setLoading(false);
    }
  }

  function getFindingCount(
    severity: string
  ): number {
    if (!result?.findings) {
      return 0;
    }

    return result.findings.filter(
      (finding) =>
        finding.severity?.toUpperCase() === severity
    ).length;
  }

  function getScoreLabel(
    score: number | null
  ): string {
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

  function getSeverityClasses(
    severity: string
  ): string {
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

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
            >
              Dashboard
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
            Security Assessment
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Run a Security Scan
          </h1>

          <p className="mt-3 max-w-3xl text-lg text-slate-400">
            Perform a safe, non-destructive assessment of a
            website that you own or are explicitly authorized
            to assess.
          </p>
        </div>

        {/* Scan Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">
              Start New Assessment
            </h2>

            <p className="mt-2 text-slate-400">
              Enter a website you own or are explicitly
              authorized to assess.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >
            {/* Target */}
            <div>
              <label
                htmlFor="targetUrl"
                className="mb-3 block text-lg font-medium"
              >
                Target URL
              </label>

              <input
                id="targetUrl"
                type="url"
                value={targetUrl}
                onChange={(event) =>
                  setTargetUrl(event.target.value)
                }
                placeholder="https://example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-4 text-lg text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />

              <p className="mt-2 text-sm text-slate-500">
                Example: https://example.com
              </p>
            </div>

            {/* Assessment Type */}
            <div>
              <p className="mb-4 text-lg font-medium">
                Assessment Type
              </p>

              <label className="block cursor-pointer rounded-2xl border border-cyan-400 bg-cyan-500/10 p-6">
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="scanType"
                    value="basic"
                    checked={scanType === "basic"}
                    onChange={() =>
                      setScanType("basic")
                    }
                    className="mt-1 h-5 w-5 accent-cyan-400"
                  />

                  <div>
                    <p className="text-lg font-semibold">
                      Basic Web Assessment
                    </p>

                    <p className="mt-2 text-slate-400">
                      Checks security headers, HTTPS/TLS
                      configuration and cookie security.
                    </p>
                  </div>
                </div>
              </label>

              <label className="mt-4 block cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950 p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="scanType"
                    value="extended"
                    checked={scanType === "extended"}
                    onChange={() =>
                      setScanType("extended")
                    }
                    disabled
                    className="mt-1 h-5 w-5"
                  />

                  <div>
                    <p className="text-lg font-semibold">
                      Extended Assessment
                    </p>

                    <p className="mt-2 text-slate-500">
                      Additional assessment modules will be
                      added in a future version.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Authorization */}
            <label className="block cursor-pointer rounded-2xl border border-yellow-500/40 bg-yellow-500/5 p-6">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(event) =>
                    setAuthorized(event.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-cyan-400"
                />

                <div>
                  <p className="text-lg font-semibold text-yellow-400">
                    Authorization confirmation
                  </p>

                  <p className="mt-2 leading-7 text-slate-400">
                    I confirm that I own this target or have
                    explicit authorization to perform this
                    security assessment.
                  </p>
                </div>
              </div>
            </label>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-red-300">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-500 px-6 py-5 text-lg font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Running Security Assessment..."
                : "Start Security Assessment"}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-10 space-y-8">
            {/* Completion */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
              <p className="text-lg text-slate-400">
                Assessment completed
              </p>

              <h2 className="mt-2 break-all text-3xl font-bold">
                {result.target}
              </h2>

              <div className="mt-8">
                <p className="text-lg text-slate-400">
                  Security Score
                </p>

                <div className="mt-2 flex items-end gap-3">
                  <span className="text-7xl font-bold text-red-400">
                    {result.security_score ?? "N/A"}
                  </span>

                  <span className="pb-3 text-lg text-slate-500">
                    out of 100
                  </span>
                </div>

                <p className="mt-2 text-lg text-slate-400">
                  {getScoreLabel(
                    result.security_score
                  )}
                </p>
              </div>
            </div>

            {/* Risk Summary */}
            <div>
              <h2 className="mb-6 text-3xl font-bold">
                Risk Summary
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
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

            {/* Scan Information */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
              <h2 className="mb-8 text-3xl font-bold">
                Scan Information
              </h2>

              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Status
                  </p>

                  <p className="mt-3 text-lg font-semibold text-emerald-400">
                    {result.status}
                  </p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Scan Type
                  </p>

                  <p className="mt-3 text-lg font-semibold capitalize">
                    {scanType}
                  </p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    HTTP Status
                  </p>

                  <p className="mt-3 text-lg font-semibold">
                    {result.http_status ?? "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-500">
                    Scan ID
                  </p>

                  <p className="mt-3 text-lg font-semibold">
                    #{result.scan_id}
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
                  {result.findings.length} finding
                  {result.findings.length === 1
                    ? ""
                    : "s"} detected.
                </p>
              </div>

              {result.findings.length === 0 ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-400">
                  No findings were returned by the
                  assessment.
                </div>
              ) : (
                <div className="space-y-5">
                  {result.findings.map(
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

            {/* Message */}
            {result.message && (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  Assessment Message
                </p>

                <p className="mt-2 text-slate-300">
                  {result.message}
                </p>
              </div>
            )}

            {/* Safety Notice */}
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
              <h3 className="font-semibold text-yellow-400">
                Authorized Security Testing
              </h3>

              <p className="mt-2 leading-7 text-slate-400">
                This platform is designed for authorized,
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
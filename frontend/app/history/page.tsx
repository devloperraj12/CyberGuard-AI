"use client";
import { API_BASE_URL } from "../../lib/config";
import { useEffect, useState } from "react";
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

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadScans();
  }, []);

  async function loadScans() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/scans`,
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

      if (!response.ok) {
        throw new Error(
          "Unable to load scan history."
        );
      }

      const data = await response.json();

      setScans(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load scan history."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteScan(scanId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this scan?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/scans/${scanId}`,
        {
          method: "DELETE",
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

      if (!response.ok) {
        throw new Error(
          "Unable to delete the scan."
        );
      }

      setScans((currentScans) =>
        currentScans.filter(
          (scan) => scan.id !== scanId
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete the scan."
      );
    }
  }

  async function deleteAllScans() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all scan history?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/scans`,
        {
          method: "DELETE",
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

      if (!response.ok) {
        throw new Error(
          "Unable to clear scan history."
        );
      }

      setScans([]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to clear scan history."
      );
    }
  }

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  function getScoreClasses(
    score: number | null
  ) {
    if (score === null) {
      return "text-slate-400";
    }

    if (score >= 80) {
      return "text-emerald-400";
    }

    if (score >= 60) {
      return "text-yellow-400";
    }

    return "text-red-400";
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
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              New Scan
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
        {/* Heading */}
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Security Operations
            </p>

            <h1 className="text-4xl font-bold">
              Scan History
            </h1>

            <p className="mt-3 text-slate-400">
              Review and manage your previous authorized
              security assessments.
            </p>
          </div>

          {scans.length > 0 && (
            <button
              onClick={deleteAllScans}
              className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Clear All History
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="text-slate-400">
              Loading scan history...
            </p>
          </div>
        ) : scans.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center">
            <h2 className="text-2xl font-semibold">
              No scans yet
            </h2>

            <p className="mt-3 text-slate-400">
              Run your first authorized security assessment
              to see it here.
            </p>

            <Link
              href="/scan"
              className="mt-6 inline-block rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Start New Scan
            </Link>
          </div>
        ) : (
          /* Scan list */
          <div className="space-y-5">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-slate-700"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                        Scan #{scan.id}
                      </span>

                      <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-semibold capitalize text-cyan-400">
                        {scan.scan_type}
                      </span>

                      <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        {scan.status}
                      </span>
                    </div>

                    <h2 className="break-all text-xl font-semibold text-white">
                      {scan.target}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(scan.created_at)}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-6 py-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Score
                    </p>

                    <p
                      className={`mt-1 text-3xl font-bold ${getScoreClasses(
                        scan.security_score
                      )}`}
                    >
                      {scan.security_score ?? "N/A"}
                    </p>
                  </div>

                  {/* Findings */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-6 py-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Findings
                    </p>

                    <p className="mt-1 text-3xl font-bold text-white">
                      {scan.findings?.length ?? 0}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/scan/${scan.id}`}
                      className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      View Report
                    </Link>

                    <button
                      onClick={() =>
                        deleteScan(scan.id)
                      }
                      className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
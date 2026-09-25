"use client";
import { API_BASE_URL } from "../../lib/config";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  clearAuth,
  getAuthHeaders,
  getUser,
  type AuthUser,
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

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    loadScans();
  }, []);

  async function loadScans() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/scans`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (response.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load scan history.");
      }

      const data = await response.json();

      setScans(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    window.location.href = "/login";
  }

  const latestScan = scans.length > 0 ? scans[0] : null;

  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  scans.forEach((scan) => {
    scan.findings?.forEach((finding) => {
      const severity = finding.severity?.toUpperCase();

      if (severity === "HIGH") {
        highCount++;
      } else if (severity === "MEDIUM") {
        mediumCount++;
      } else if (severity === "LOW") {
        lowCount++;
      } else if (severity === "INFO") {
        infoCount++;
      }
    });
  });

  const totalFindings =
    highCount + mediumCount + lowCount + infoCount;

  function getScoreLabel(score: number | null) {
    if (score === null) {
      return "No score";
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

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
          >
            <span className="text-cyan-400">CyberGuard</span>
            <span className="text-white"> AI</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 md:block">
              {user?.email ?? "Loading..."}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Security Operations
            </p>

            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Security Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Monitor your authorized web security assessments,
              findings, and security posture from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/scan"
              className="rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              + New Security Scan
            </Link>

            <Link
              href="/history"
              className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-400"
            >
              View History
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="text-slate-400">
              Loading security dashboard...
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {/* Latest Score */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Latest Security Score
                  </span>

                  <span className="rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-400">
                    SCORE
                  </span>
                </div>

                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold">
                    {latestScan?.security_score ?? "—"}
                  </span>

                  {latestScan?.security_score !== null &&
                    latestScan?.security_score !== undefined && (
                      <span className="pb-2 text-sm text-slate-400">
                        / 100
                      </span>
                    )}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {latestScan
                    ? getScoreLabel(latestScan.security_score)
                    : "Run your first scan"}
                </p>
              </div>

              {/* Total Scans */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Total Scans
                  </span>

                  <span className="rounded-lg bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-400">
                    SCANS
                  </span>
                </div>

                <div className="text-5xl font-bold">
                  {scans.length}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Authorized assessments
                </p>
              </div>

              {/* High Risk */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    High Risk Findings
                  </span>

                  <span className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400">
                    HIGH
                  </span>
                </div>

                <div className="text-5xl font-bold text-red-400">
                  {highCount}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Requires attention
                </p>
              </div>

              {/* Total Findings */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Total Findings
                  </span>

                  <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-400">
                    FINDINGS
                  </span>
                </div>

                <div className="text-5xl font-bold">
                  {totalFindings}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Across all assessments
                </p>
              </div>
            </div>

            {/* Findings Overview */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">
                    Findings Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Severity distribution across your scans
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-red-500/10 bg-red-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-red-400" />
                      <span className="text-sm text-slate-300">
                        High
                      </span>
                    </div>

                    <span className="font-bold text-red-400">
                      {highCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-orange-500/10 bg-orange-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-orange-400" />
                      <span className="text-sm text-slate-300">
                        Medium
                      </span>
                    </div>

                    <span className="font-bold text-orange-400">
                      {mediumCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-yellow-400" />
                      <span className="text-sm text-slate-300">
                        Low
                      </span>
                    </div>

                    <span className="font-bold text-yellow-400">
                      {lowCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-slate-400" />
                      <span className="text-sm text-slate-300">
                        Informational
                      </span>
                    </div>

                    <span className="font-bold text-slate-300">
                      {infoCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Latest Scan */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">
                    Latest Assessment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Most recent security scan
                  </p>
                </div>

                {latestScan ? (
                  <div className="space-y-5">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                        Target
                      </p>

                      <p className="break-all font-medium text-cyan-400">
                        {latestScan.target}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">
                          Scan Type
                        </p>

                        <p className="mt-1 font-semibold capitalize">
                          {latestScan.scan_type}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">
                          HTTP Status
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestScan.http_status ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-xs text-slate-500">
                        Scan Date
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-300">
                        {formatDate(latestScan.created_at)}
                      </p>
                    </div>

                    <Link
                      href="/history"
                      className="block rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-center text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/10"
                    >
                      View Full Scan Details
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                    <p className="text-slate-400">
                      No security assessments yet.
                    </p>

                    <Link
                      href="/scan"
                      className="mt-4 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      Run your first scan →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Scans */}
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Recent Scans
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your latest authorized assessments
                  </p>
                </div>

                <Link
                  href="/history"
                  className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  View all →
                </Link>
              </div>

              {scans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
                  <p className="text-slate-400">
                    No scans available.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-4 font-medium">
                          Target
                        </th>

                        <th className="px-4 py-4 font-medium">
                          Type
                        </th>

                        <th className="px-4 py-4 font-medium">
                          Score
                        </th>

                        <th className="px-4 py-4 font-medium">
                          Findings
                        </th>

                        <th className="px-4 py-4 font-medium">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {scans.slice(0, 5).map((scan) => (
                        <tr
                          key={scan.id}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="max-w-[280px] px-4 py-4">
                            <div className="truncate font-medium text-slate-200">
                              {scan.target}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Scan #{scan.id}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium capitalize text-slate-300">
                              {scan.scan_type}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={
                                scan.security_score !== null &&
                                scan.security_score >= 80
                                  ? "font-bold text-emerald-400"
                                  : scan.security_score !== null &&
                                      scan.security_score >= 60
                                    ? "font-bold text-yellow-400"
                                    : "font-bold text-red-400"
                              }
                            >
                              {scan.security_score ?? "—"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {scan.findings?.length ?? 0}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                            {formatDate(scan.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  !
                </div>

                <div>
                  <h3 className="font-semibold text-cyan-300">
                    Authorized Security Testing
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    CyberGuard AI is designed for authorized,
                    non-destructive security assessments. Only scan
                    websites and systems that you own or have explicit
                    permission to assess.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
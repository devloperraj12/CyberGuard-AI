"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders, getToken } from "@/lib/auth";

type Project = {
  id: number;
  name: string;
  description: string | null;
  target_url: string;
  created_at: string;
  updated_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");

  async function loadProjects() {
    try {
      setError("");

      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load projects.");
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load projects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !targetUrl.trim()) {
      setError("Project name and target URL are required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          target_url: targetUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create project.");
      }

      setProjects((current) => [data, ...current]);

      setName("");
      setDescription("");
      setTargetUrl("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-400">
              CYBERGUARD AI
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Security Projects
            </h1>

            <p className="mt-2 text-slate-400">
              Organize targets, scans, findings and security assessments.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Create Project */}
        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Create New Project</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add an authorized web target to CyberGuard AI.
            </p>
          </div>

          <form onSubmit={createProject} className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Project Name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Website Security"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Target URL
              </label>

              <input
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://example.com"
                type="url"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe this security assessment project..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </section>

        {/* Projects */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your Projects</h2>
              <p className="mt-1 text-sm text-slate-400">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
              <h3 className="text-lg font-semibold">
                No projects yet
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Create your first security assessment project above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition hover:border-slate-700"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <button
  onClick={() =>
    (window.location.href = `/scan?project_id=${project.id}`)
  }
  className="text-left text-lg font-semibold transition hover:text-cyan-400"
>
  {project.name}
</button>

                      <p className="mt-1 text-xs text-slate-500">
                        Project #{project.id}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                      Active
                    </span>
                  </div>

                  <div className="mb-4 rounded-lg bg-slate-950 px-4 py-3">
                    <p className="break-all text-sm text-cyan-400">
                      {project.target_url}
                    </p>
                  </div>

                  {project.description && (
                    <p className="mb-5 text-sm leading-6 text-slate-400">
                      {project.description}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        (window.location.href = `/scan?project_id=${project.id}`)
                      }
                      className="flex-1 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Scan Project
                    </button>

                    <button
                      onClick={() =>
                        (window.location.href = `/history?project_id=${project.id}`)
                      }
                      className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                    >
                      History
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
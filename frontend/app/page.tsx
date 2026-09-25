import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 font-bold text-slate-950">
              C
            </div>

            <span className="text-xl font-bold">
              CyberGuard AI
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              How It Works
            </a>

            <a
              href="#technology"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Technology
            </a>

            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-400">
            AI-Powered Security Analysis
          </div>

          <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight md:text-7xl">
            Understand Your
            <span className="text-cyan-400">
              {" "}Security Risks
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            CyberGuard AI helps developers and security teams analyze
            authorized web applications, identify security weaknesses,
            and understand how to improve their security posture.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <button className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400">
              Start Security Scan
            </button>

            <button className="rounded-lg border border-slate-700 px-6 py-3 font-semibold transition hover:bg-slate-900">
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Platform
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Security analysis built for developers
            </h2>

            <p className="mt-4 max-w-2xl text-slate-400">
              Combine automated security checks with AI-assisted
              explanations and actionable remediation guidance.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="🔍"
              title="Security Scanner"
              description="Analyze authorized targets for common web security configuration issues."
            />

            <FeatureCard
              icon="🤖"
              title="AI Security Analyst"
              description="Turn technical findings into understandable explanations and remediation guidance."
            />

            <FeatureCard
              icon="🔐"
              title="TLS Analysis"
              description="Review HTTPS and TLS-related configuration and certificate information."
            />

            <FeatureCard
              icon="🌐"
              title="Network Exposure"
              description="Understand exposed services and potential areas requiring security review."
            />

            <FeatureCard
              icon="📊"
              title="Security Dashboard"
              description="Track findings, scores, scan history and security trends in one place."
            />

            <FeatureCard
              icon="📄"
              title="Security Reports"
              description="Generate structured reports containing findings, evidence and remediation steps."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Workflow
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              From scan to understanding
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <Step
              number="01"
              title="Add an authorized target"
              description="Provide a website or security asset that you own or have permission to assess."
            />

            <Step
              number="02"
              title="Run security analysis"
              description="CyberGuard performs structured security checks and organizes the findings."
            />

            <Step
              number="03"
              title="Understand and improve"
              description="AI explains the findings and provides developer-friendly remediation guidance."
            />
          </div>
        </div>
      </section>

      {/* Technology */}
      <section
        id="technology"
        className="border-t border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Engineering
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Built with modern technologies
            </h2>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {[
              "Next.js",
              "TypeScript",
              "Tailwind CSS",
              "FastAPI",
              "Python",
              "PostgreSQL",
              "AI",
              "Docker",
            ].map((technology) => (
              <div
                key={technology}
                className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm text-slate-300"
              >
                {technology}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 CyberGuard AI</p>

          <p>
            Built for authorized security assessment and learning.
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 transition hover:border-cyan-500/40">
      <div className="text-3xl">{icon}</div>

      <h3 className="mt-5 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-8">
      <div className="text-sm font-bold text-cyan-400">
        {number}
      </div>

      <h3 className="mt-4 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}
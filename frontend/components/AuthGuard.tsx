"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getToken } from "../lib/auth";

type AuthGuardProps = {
  children: ReactNode;
};

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
];

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setChecking(false);
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

          <p className="text-sm text-slate-400">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
import type { Metadata } from "next";

import "./globals.css";
import AuthGuard from "../components/AuthGuard";

export const metadata: Metadata = {
  title: "CyberGuard AI",
  description:
    "AI-powered authorized web security assessment platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}
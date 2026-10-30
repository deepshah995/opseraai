import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opsera AI | Autonomous Operations Agent Platform",
  description: "Discrepancy reconciliation, revenue protection, and multi-agent operations intelligence for industrial services and hauling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { getViewer } from "@/lib/session";
import "./globals.css";

// Every page depends on the signed-in user's plan.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FinCompare — Financial Statement Analysis",
  description: "Compare public companies' financial statements, ratios and trends using SEC EDGAR data.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <div className="mx-auto flex max-w-[1500px] gap-5 p-4 lg:p-5">
          <Sidebar plan={viewer.plan.id} email={viewer.user?.email ?? null} authEnabled={viewer.authEnabled} />
          <main className="min-w-0 flex-1">
            <MobileNav />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

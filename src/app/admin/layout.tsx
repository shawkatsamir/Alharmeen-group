"use client";

import { useState } from "react";
import { Sidebar } from "@/features/admin/components/Sidebar";
import { Header } from "@/features/admin/components/Header";
import { ChevronLeft } from "lucide-react";
import { ThemeProvider } from "@/features/admin/components/ThemeProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {/* Mobile Toggle Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 right-4 z-50 p-2 bg-background border border-border rounded-md shadow-md lg:hidden text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 right-0 z-40 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarOpen
              ? "translate-x-0 w-64"
              : "translate-x-full w-64 lg:w-20 lg:translate-x-0"
          }`}
        >
          <Sidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
            {children}
          </main>
        </div>
      </ThemeProvider>
    </div>
  );
}

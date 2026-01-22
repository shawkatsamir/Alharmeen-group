import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Header from "@/shared/components/layout/Header";
import Footer from "@/shared/components/layout/Footer";
import { Toaster } from "sonner";

const cairo = Cairo({ subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "Al Harmeen Group",
  description: "أفضل متجر للأجهزة المنزلية في مصر",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <Header />
        {children}
        <Toaster position="top-center" />
        <Footer />
      </body>
    </html>
  );
}

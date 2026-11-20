import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/shared/components/ui/Sonner";
import { Providers } from "@/providers/QueryProvider";
import { Analytics } from "@vercel/analytics/next";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://alharmaingroup.com"),
  title: {
    default: "الحرمين جروب - أفضل متجر للأجهزة المنزلية في مصر",
    template: "%s | الحرمين جروب",
  },
  description:
    "موقع الحرمين جروب يقدم تشكيلة واسعة من الأجهزة المنزلية والمنتجات الكهربائية بأفضل الأسعار في مصر. تسوق الآن واحصل على عروض مميزة.",
  keywords: [
    "أجهزة منزلية",
    "كهرباء",
    "مصر",
    "الحرمين جروب",
    "تسوق اونلاين",
    "أدوات مطبخ",
  ],
  authors: [{ name: "Alharmeen Group" }],
  creator: "Alharmeen Group",
  publisher: "Alharmeen Group",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "الحرمين جروب - أفضل متجر للأجهزة الكهربائية و المنزلية في مصر",
    description:
      "موقع الحرمين جروب يقدم تشكيلة واسعة من الأجهزة المنزلية والمنتجات الكهربائية بأفضل الأسعار في مصر.",
    url: "https://alharmaingroup.com",
    siteName: "الحرمين جروب",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الحرمين جروب - أفضل متجر للأجهزة الكهربائية و المنزلية في مصر",
    description:
      "موقع الحرمين جروب يقدم تشكيلة واسعة من الأجهزة المنزلية والمنتجات الكهربائية بأفضل الأسعار في مصر.",
  },
  verification: {
    google: "QrAtqQSgGfCYZleJeg3l3j8e-LHZWQHFqTaP9nMxYow",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Alharmeen Group",
    url: "https://alharmaingroup.com",
    // Rendered from the BrandWordmark paths (see CLAUDE.md, Brand and motion).
    logo: "https://alharmaingroup.com/logo.png",
    // Same number, address and page as the footer and /contact.
    address: {
      "@type": "PostalAddress",
      streetAddress: "شارع الكنيسة، طريق الإبراهيمية",
      addressLocality: "ديرب نجم",
      addressRegion: "الشرقية",
      addressCountry: "EG",
    },
    sameAs: ["https://www.facebook.com/share/17zDjvxrcJ/"],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+20-103-172-2719",
      contactType: "customer service",
      areaServed: "EG",
      availableLanguage: "Arabic",
    },
  };

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={cairo.variable}
    >
      <head>
        <link
          rel="preconnect"
          href="https://zhpkzslvzifaaehdfnha.supabase.co"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster position="top-center" />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}

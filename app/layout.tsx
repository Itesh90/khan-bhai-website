import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://khanbhais.in"
  ),
  title: {
    default: "Khan Bhai S. — Luxury Hotel, Restaurant & Travel",
    template: "%s · Khan Bhai S.",
  },
  description:
    "A heritage hotel of restful rooms, a kitchen where Awadhi recipes meet the Kumaoni hills, and a travel desk through Nainital, Corbett and beyond.",
  keywords: [
    "hotel",
    "restaurant",
    "travel",
    "luxury",
    "khan bhai",
    "haldwani",
    "uttarakhand",
    "nainital",
    "jim corbett",
  ],
  authors: [{ name: "Khan Bhai S." }],
  openGraph: {
    title: "Khan Bhai S. — Luxury Hotel, Restaurant & Travel",
    description:
      "Three traditions under one roof — heritage hotel, Awadhi-Kumaoni kitchen and a curated travel desk in the foothills of Uttarakhand.",
    type: "website",
    locale: "en_IN",
    siteName: "Khan Bhai S.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Khan Bhai S. — Luxury Hotel, Restaurant & Travel",
    description:
      "A heritage hotel, an Awadhi-Kumaoni kitchen and a curated travel desk in the Uttarakhand foothills.",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0D0D",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <a href="#main" className="kb-skip">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

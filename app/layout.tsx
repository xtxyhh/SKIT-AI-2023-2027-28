import type { Metadata } from "next";
import "./globals.css";
import AuthListener from "@/components/AuthListener";

export const metadata: Metadata = {
  metadataBase: new URL("https://healwithindia.vercel.app"),

  title: {
    default: "HealWithIndia | Medical Tourism & Smart Tourist Protection System",
    template: "%s | HealWithIndia",
  },

  description:
    "Connect with India's leading hospitals, experienced doctors and affordable treatment options with an integrated Smart Tourist Protection System for international medical travellers.",

  keywords: [
    "Medical Tourism India",
    "Smart Tourist Protection System",
    "International Patient Safety India",
    "Medical Travel Safety Platform",
    "Treatment in India",
    "Healthcare Concierge",
    "Medical Travel",
    "Apollo Hospitals",
    "Fortis Healthcare",
    "Medanta",
    "Cancer Treatment India",
    "Heart Surgery India",
    "IVF India",
    "Orthopedic Surgery India",
    "Kidney Transplant India",
  ],

  authors: [
    {
      name: "HealWithIndia",
    },
  ],

  creator: "HealWithIndia",

  publisher: "HealWithIndia",

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },

  openGraph: {
    title:
      "HealWithIndia | Medical Tourism & Smart Tourist Protection System",

    description:
      "Access India's leading hospitals and save up to 90% on treatment costs with an integrated Smart Tourist Protection System for international medical travellers.",

    url: "https://healwithindia.vercel.app",

    siteName: "HealWithIndia",

    locale: "en_US",

    type: "website",

    images: [
      {
        url: "/images/hero-doctor.png",
        width: 1200,
        height: 630,
        alt: "HealWithIndia",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "HealWithIndia | Medical Tourism & Healthcare Concierge",

    description:
      "World-class healthcare in India with up to 90% cost savings.",

    images: ["/images/hero-doctor.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "name": "HealWithIndia",
  "url": "https://healwithindia.vercel.app",
  "logo": "https://healwithindia.vercel.app/images/logo.png",
  "description":
    "India's premier Medical Tourism & Smart Tourist Protection Platform connecting international patients with JCI/NABH accredited hospitals.",
  "medicalSpecialty": [
    "Cardiovascular",
    "Oncologic",
    "Orthopedic",
    "Gynecologic",
    "Surgical",
    "Renal",
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+91-98111-00001",
    "contactType": "emergency",
    "availableLanguage": ["English", "Arabic", "French", "Hindi"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-black text-white">
        <AuthListener />
        {children}
      </body>
    </html>
  );
}
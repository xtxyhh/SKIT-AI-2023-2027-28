import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://healwithindia.vercel.app";
  const now = new Date();

  return [
    // Core Marketing & Education
    { url: `${baseUrl}`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/why-india`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/protection`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/success-stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },

    // Hospitals Directory & Profiles
    { url: `${baseUrl}/hospitals`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/hospitals/apollo`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/hospitals/fortis`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/hospitals/manipal`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/hospitals/max`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/hospitals/medanta`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/hospitals/narayana`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },

    // Treatments Directory & Specializations
    { url: `${baseUrl}/treatments`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/treatments/cardiology`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/treatments/ivf`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/treatments/kidney-transplant`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/treatments/liver-transplant`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/treatments/oncology`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/treatments/orthopedics`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },

    // International Patient Hubs
    { url: `${baseUrl}/patients-from-australia`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/patients-from-canada`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/patients-from-nigeria`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/patients-from-uae`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/patients-from-uk`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/patients-from-usa`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },

    // Authentication entry points
    { url: `${baseUrl}/patient-login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/reset-password`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },

    // Legal
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}

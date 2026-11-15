import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/patient",
          "/patient/",
          "/coordinator",
          "/coordinator/",
          "/safety",
          "/safety/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://healwithindia.vercel.app/sitemap.xml",
  };
}

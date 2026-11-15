import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HealWithIndia | Medical Tourism & Smart Tourist Protection",
    short_name: "HealWithIndia",
    description:
      "India's premier Medical Tourism & Smart Tourist Protection Platform connecting international patients with JCI/NABH accredited hospitals.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

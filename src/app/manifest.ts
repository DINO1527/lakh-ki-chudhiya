import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lakh Ki Chudhiya",
    short_name: "Lakh Ki Chudhiya",
    description: "Handcrafted lac bangles.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff5e4",
    theme_color: "#500d1b",
  };
}

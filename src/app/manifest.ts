import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lacora | Handcrafted lac bangles",
    short_name: "Lacora",
    description:
      "Discover Lacora's handcrafted lac bangles in expressive colours and timeless circles.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5b0b20",
  };
}

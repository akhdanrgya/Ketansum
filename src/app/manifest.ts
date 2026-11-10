import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "Ketansum — Ruang Tim",
    short_name: "Ketansum",
    description: "Kasir dan pengelolaan usaha Ketansum.",
    lang: "id",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#fffef8",
    theme_color: "#064696",
    icons: [
      {
        src: "/icons/admin-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/admin-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/admin-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
export const viewport: Viewport = {
  themeColor: "#064696",
  viewportFit: "cover",
};
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ketansum", statusBarStyle: "default" },
  icons: { apple: "/icons/admin-180.png" },
  title: {
    default: "Ketansum — Manisnya ketan. Gurihnya dimsum.",
    template: "%s | Ketansum",
  },
  description:
    "Ketan susu dan dimsum dalam satu cerita. Kenalan dengan Ketansum, usaha kuliner untuk tugas kewirausahaan.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
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

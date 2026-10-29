import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
export const metadata: Metadata = {
  title: "Lingo",
  applicationName: "Lingo",
  description: "A little preparation. A more immersive read.",
  icons: {
    icon: { url: "/lingo-favicon.png", type: "image/png", sizes: "512x512" },
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

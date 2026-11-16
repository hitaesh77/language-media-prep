import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
export const metadata: Metadata = {
  title: "Lingo",
  applicationName: "Lingo",
  description: "Arabic vocabulary preparation and practice.",
  icons: {
    icon: { url: "/lingo-favicon.png?v=2", type: "image/png", sizes: "512x512" },
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

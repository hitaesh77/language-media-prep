import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Language Media Prep", description: "A little preparation. A more immersive read." };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuestLantern Platform Admin",
  description: "Control-plane operator console for GuestLantern platform administration."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

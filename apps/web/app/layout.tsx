import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minikura - Minecraft Server Manager",
  description: "Manage your Minecraft servers with ease",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

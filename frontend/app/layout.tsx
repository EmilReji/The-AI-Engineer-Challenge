import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kindling — a thoughtful reset",
  description: "A small space to turn a tangled thought into a next step.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

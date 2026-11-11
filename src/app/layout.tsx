import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catechismo - Iscrizioni",
  description: "Registrazione ragazzi del catechismo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const geistSans = Sora ({
  variable: "--font-setting",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Créditos del Sur | Sistema de Gestión",
  description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",
  manifest: "/site.webmanifest",
};

import QueryProvider from "@/components/providers/QueryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}


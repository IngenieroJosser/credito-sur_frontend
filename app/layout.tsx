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
};

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
        {children}
      </body>
    </html>
  );
}

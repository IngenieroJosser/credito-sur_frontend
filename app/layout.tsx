"use client";

import type { Metadata } from "next";
import { useEffect } from "react";
import { Sora } from "next/font/google";
import "./globals.css";

import { NotificationProvider } from "@/components/providers/NotificationProvider";

const sora = Sora({
  variable: "--font-setting",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Créditos del Sur | Sistema de Gestión",
  description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",

  applicationName: "Créditos del Sur",
  manifest: "/manifest.json", // PWA manifest

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },

  themeColor: "#08557f", // color principal Credisur

  openGraph: {
    title: "Créditos del Sur",
    description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",
    type: "website",
    locale: "es_CO",
  },

  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {

  // Registrar Service Worker en producción
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registrado:", reg))
        .catch(err => console.error("SW error:", err));
    }
  }, []);

  // Eliminar SW antiguos en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => r.unregister());
      });
    }
  }, []);

  return (
    <html lang="es">
      <head>
        {/* Manifest PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#08557f" />
      </head>
      <body className={`${sora.variable} antialiased`}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}

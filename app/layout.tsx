import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { NotificacionesProvider } from "@/components/providers/NotificacionesProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import OfflineIndicatorWrapper from "../components/offline/OfflineIndicatorWrapper";
import { Toaster } from "sonner";

const sora = Sora({
  variable: "--font-setting",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Créditos del Sur | Sistema de Gestión",
  description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",
  applicationName: "Créditos del Sur",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Créditos del Sur",
    description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",
    type: "website",
    locale: "es_CO",
  },
};

//  Nueva exportación de viewport
export const viewport: Viewport = {
  themeColor: "#08557f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // La app es de tema claro (todas las tarjetas son bg-white con textos oscuros).
  // Sin esto, un móvil con el SO en modo oscuro fuerza el foreground a casi
  // blanco y los textos sin color explícito quedan invisibles sobre las tarjetas.
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Las siguientes líneas YA NO son necesarias, Next.js las inyecta:
        <meta name="theme-color" content="#08557f" />
        <meta name="viewport" content="width=device-width, initial-scale=1" /> 
        */}
      </head>
      <body className={`${sora.variable} antialiased`}>
        <NotificationProvider>
          <NotificacionesProvider>
            {children}
            <OfflineIndicatorWrapper />
            <Toaster position="top-right" richColors closeButton />
          </NotificacionesProvider>
        </NotificationProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
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
  manifest: "/site.webmanifest",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },

  themeColor: "#0f172a", // ajusta a tu branding

  openGraph: {
    title: "Créditos del Sur",
    description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",
    type: "website",
    locale: "es_CO",
  },

  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${sora.variable} antialiased`}>
        <NotificationProvider>
          {children}
        </NotificationProvider>

        {/* Solo para desarrollo — evita bugs con SW antiguos */}
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(r => r.unregister());
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}

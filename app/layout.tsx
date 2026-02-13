import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const geistSans = Sora ({
  variable: "--font-setting",
  subsets: ["latin"],
});


import { NotificationProvider } from "@/components/providers/NotificationProvider";

export const metadata: Metadata = {
  title: "Créditos del Sur | Sistema de Gestión",
  description: "Sistema profesional para gestión de créditos, préstamos y cobranzas",
  manifest: "/site.webmanifest",
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
        <NotificationProvider>
          {children}
        </NotificationProvider>

        {/* Script para limpiar Service Workers antiguos que causan errores en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
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


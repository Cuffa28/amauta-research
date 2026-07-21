import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppFrame from "@/components/AppFrame";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-fira",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Amauta Local | Inversiones Financieras",
  description:
    "Portal interno de Amauta Inversiones Financieras — research, monitor de CEDEARs, FCIs, noticias, simulador y chat financiero en un solo lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={firaSans.variable}>
        {/* Librerías que usan los módulos nativos legacy (CEDEARs/Noticias) */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"
          strategy="beforeInteractive"
        />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GADA DSS — Sistem Pendukung Keputusan Multi-Kriteria",
  description:
    "Implementasi universal metode Grey Absolute Decision Analysis (GADA) untuk evaluasi multi-kriteria dan multi-responden pada berbagai dataset.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}

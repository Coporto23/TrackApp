import type { Metadata, Viewport } from "next";
import { Alegreya_Sans, Cinzel } from "next/font/google";
import { LowPolyBackdrop } from "@/components/low-poly-backdrop";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const alegreyaSans = Alegreya_Sans({
  variable: "--font-alegreya-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: { default: "TrackApp", template: "%s · TrackApp" },
  description: "Registro de sobrecarga progresiva para tus rutinas de hipertrofia.",
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${cinzel.variable} ${alegreyaSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LowPolyBackdrop />
        {children}
      </body>
    </html>
  );
}

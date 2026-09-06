import type { Metadata } from "next";
import { Cinzel, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thermaform | Himalayan Thermal Fair & Passive Shelter Platform",
  description: "A computational platform for passive thermal comfort, envelope optimization, and energy-aware shelter design in high-altitude cold climates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${cinzel.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        <Navbar />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}

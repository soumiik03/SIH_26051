import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cold-Climate Shelter Thermal Comfort Design | SIH 2026",
  description: "Passive thermal comfort design and optimization platform for cold-climate shelters in the Ladakh region.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        <Navbar />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}

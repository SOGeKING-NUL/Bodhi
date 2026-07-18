import type React from "react";
import type { Metadata } from "next";
import { Montserrat, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ClerkUserSync from "@/components/ClerkUserSync";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

// Kept the CSS variable named "--font-inter" (dozens of call sites reference
// it) even though it now loads Montserrat — repointing what the token
// resolves to was a 2-file change vs. a mechanical rename across ~8 files.
const inter = Montserrat({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Bodhi — AI Mock Interviewer",
  description: "Voice-first AI mock interview platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body className="font-sans antialiased">
        <ClerkProvider>
          <SmoothScroll>
          <ClerkUserSync />
          {children}
          </SmoothScroll>
        </ClerkProvider>
      </body>
    </html>
  );
}

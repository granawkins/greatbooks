import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "@/lib/AudioPlayerContext";
import PersistentPlayerBar from "@/components/PersistentPlayerBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Great Books",
  description:
    "Classic literature — read, listen, and explore with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <AudioPlayerProvider>
          {children}
          <PersistentPlayerBar />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}

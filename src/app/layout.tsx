import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "@/lib/AudioPlayerContext";
import { AuthProvider } from "@/lib/AuthContext";
import PersistentPlayerBar from "@/components/audio/PersistentPlayerBar";

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
        <AuthProvider>
          <AudioPlayerProvider>
            {children}
            <PersistentPlayerBar />
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "@/lib/AudioPlayerContext";
import { AuthProvider } from "@/lib/AuthContext";
import PersistentPlayerBar from "@/components/audio/PersistentPlayerBar";
import TopBar from "@/components/TopBar";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { TopBarProvider } from "@/lib/TopBarContext";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Great Books",
  description:
    "Classic literature — read, listen, and explore with AI.",
  icons: {
    icon: [
      { url: "/logo-v2-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-v2-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/logo-v2-180.png",
  },
};

// Inline script to set dark class before first paint (prevents flash)
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${cormorant.variable} ${dmSans.variable} antialiased`}>
        <ThemeProvider />
        <AuthProvider>
          <AudioPlayerProvider>
            <TopBarProvider>
              <TopBar />
              <div style={{ paddingTop: "var(--topbar-height)" }}>
                {children}
              </div>
            </TopBarProvider>
            <PersistentPlayerBar />
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

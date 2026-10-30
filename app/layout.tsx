import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const lkKaohom = localFont({
  src: "../public/assets/fonts/LKKaohom-Freecomm.ttf",
  variable: "--font-kaohom",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Attndee. - Smart Attendance System",
  description: "Secure, GPS-verified attendance tracking for modern classrooms. Check in with your Attndee. Pass™",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexSansThai.variable} ${lkKaohom.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

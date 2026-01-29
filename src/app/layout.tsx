import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import LayoutClient from "../components/LayoutClient";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "CPack Manufacturing",
  description: "Live Production Tracking & Order Management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CPack",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthProvider } from "../components/AuthProvider";
import { DataStoreProvider } from "../components/DataStoreProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <DataStoreProvider>
            <LayoutClient>{children}</LayoutClient>
          </DataStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

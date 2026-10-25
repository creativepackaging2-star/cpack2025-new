import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import LayoutClient from "../components/LayoutClient";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
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
    <html lang="en" className={montserrat.className}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${montserrat.className} ${montserrat.variable} font-sans antialiased`}
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

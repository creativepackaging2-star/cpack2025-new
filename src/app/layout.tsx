import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Print Manufacturing App",
  description: "Managed by CPack",
};

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
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

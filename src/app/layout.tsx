import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from '@/contexts/ToastContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VecinoCustom - Influencer Platform",
  description: "Internal influencer management platform for VecinoCustom",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

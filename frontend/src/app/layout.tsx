import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ระบบจัดการเวชภัณฑ์",
  description: "ระบบจัดการเวชภัณฑ์และอุปกรณ์ทางการแพทย์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}

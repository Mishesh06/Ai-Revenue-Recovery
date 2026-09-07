import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MerchantProvider } from "@/context/MerchantContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppShell } from "@/components/layout/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-override",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RecoverAI — Operations Center",
  description: "AI-powered revenue recovery operating system for Razorpay merchants. Monitor, analyze, and recover failed transactions in real-time.",
  keywords: ["revenue recovery", "payment operations", "AI", "fintech", "Razorpay"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <TooltipProvider>
          <ToastProvider>
            <MerchantProvider>
              <AppShell>{children}</AppShell>
            </MerchantProvider>
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
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
  title: "PayRecover — AI Revenue Recovery",
  description: "PayRecover: Autonomous AI-powered payment recovery platform. Monitor failed transactions, recover lost revenue, and get actionable insights in real-time.",
  keywords: ["revenue recovery", "payment recovery", "AI", "fintech", "failed payments", "PayRecover"],
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
            <AuthProvider>
              <MerchantProvider>
                <AppShell>{children}</AppShell>
              </MerchantProvider>
            </AuthProvider>
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

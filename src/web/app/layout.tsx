import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { epilogue, dmSans, mono, display } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoCo Make Lab",
  description: "Professional 3D printing services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${epilogue.variable} ${dmSans.variable} ${mono.variable} ${display.variable} font-(family-name:--font-dm-sans) antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
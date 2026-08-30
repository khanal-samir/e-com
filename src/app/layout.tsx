import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: {
    default: "SS Tech — Laptops for Nepal",
    template: "%s · SS Tech",
  },
  description:
    "Buy laptops online in Nepal. Gaming, business and student laptops from ASUS, Acer, Apple, Dell, HP, Lenovo and MSI with eSewa payment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen font-sans">
        <CartProvider>{children}</CartProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

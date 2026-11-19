import { Golos_Text, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
const golosText = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin"]
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});
export const metadata = {
  title: "finister — Practice Management",
  description: "Client, payment, TDS and compliance tracking for CA firms"
};
export default function RootLayout({
  children
}) {
  return <html lang="en" className={`${golosText.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>;
}

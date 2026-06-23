import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CareAssistChat from "@/components/chat/CareAssistChat";
import { LocaleProvider } from "@/components/ui/locale-provider";
import InstallPrompt from "@/components/pwa/install-prompt";
import OfflineBanner from "@/components/pwa/offline-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#001F5B",
};

export const metadata: Metadata = {
  title: "Higsi 245D Suite",
  description: "Minnesota 245D compliance management for home and community-based service providers.",
  appleWebApp: {
    capable: true,
    title: "Higsi",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          {children}
          <CareAssistChat />
        </LocaleProvider>
        <InstallPrompt />
        <OfflineBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){var h=location.hostname;if(h==='localhost'||h==='127.0.0.1'){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{})}else{window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}}`,
          }}
        />
      </body>
    </html>
  );
}

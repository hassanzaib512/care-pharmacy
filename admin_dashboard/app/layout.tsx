import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Care Pharmacy Admin",
  description: "Admin dashboard for Care Pharmacy",
  icons: {
    icon: "/care_pharmacy_logo.ico",
    shortcut: "/care_pharmacy_logo.ico",
    apple: "/care_pharmacy_logo.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

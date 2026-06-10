import type { Metadata } from "next";
import { Noto_Sans, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { AppShell } from "../components/AppShell";

const primaryFont = Roboto_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-primary"
});
const supportFont = Noto_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-support"
});

export const metadata: Metadata = {
  title: "BTM Team Generator",
  description: "Production-ready team generation and fairness analytics"
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body className={`${primaryFont.variable} ${supportFont.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

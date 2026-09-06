import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vernova — Vernacular Pedagogy Assistant",
  description:
    "Offline AI translation and worksheet generation for mother-tongue classroom teaching. SIH26042.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable} h-full`}>
      <body className="h-full">
        <div className="phone-shell">
          <div className="phone-frame">
            <div className="scroll-area">{children}</div>
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}

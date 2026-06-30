import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://fernanda-freitas.github.io/image-to-character/";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Image to ASCII Converter",
  description:
    "Convert any image into ASCII art directly in your browser. Adjust brightness, character sets, edge detection and more in real time.",
  keywords: [
    "ascii art",
    "image to ascii",
    "ascii converter",
    "text art generator",
    "image to text art",
  ],
  authors: [{ name: "Fernanda Freitas" }],
  openGraph: {
    title: "Image to ASCII Converter",
    description:
      "Convert any image into ASCII art directly in your browser. Adjust brightness, character sets, edge detection and more in real time.",
    url: siteUrl,
    siteName: "Image to ASCII Converter",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Image to ASCII Converter",
    description:
      "Convert any image into ASCII art directly in your browser. Adjust brightness, character sets, edge detection and more in real time.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "GenUI Spectrum", template: "%s · GenUI Spectrum" },
  description:
    "One prompt rendered four ways, side by side: Markdown text, an A2UI surface, freeform HTML and an AG-UI generated form.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-[1800px] items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight text-zinc-950">
              GenUI Spectrum
            </Link>
            <Link href="/" className="text-zinc-600 hover:text-zinc-950">
              Gallery
            </Link>
            <Link href="/findings" className="text-zinc-600 hover:text-zinc-950">
              Findings
            </Link>
            <a
              href="https://github.com/parvezk/genui-spectrum"
              className="ml-auto text-zinc-500 hover:text-zinc-950"
              rel="noreferrer"
            >
              Source
            </a>
          </nav>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-500">
          Every rendering is a saved fixture. The app makes no model or API calls at runtime.
        </footer>
      </body>
    </html>
  );
}

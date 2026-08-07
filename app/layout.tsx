import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "JoyCRM — Corporate Solutions CRM & Client Portal",
  description:
    "JoyCRM unifies project management, CRM, client portal, finance, and team management for Joy Corporate Solutions.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#0B0B0F",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark bg-[var(--background)] text-[var(--text-primary)]`}
      style={{ colorScheme: "dark", backgroundColor: "#0B0B0F" }}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-[var(--background)] text-[var(--text-primary)] min-h-svh w-full overflow-x-hidden" suppressHydrationWarning>
        <TooltipProvider delay={200}>{children}</TooltipProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OmniVault — Personal Media & Data Vault',
  description:
    'Your private, cloud-hosted archive for WhatsApp media, links, documents, and notes. No local storage bloat.',
  keywords: ['personal vault', 'media archive', 'WhatsApp backup', 'cloud storage', 'document vault'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-mesh" aria-hidden="true" />
        <div className="bg-grid" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}

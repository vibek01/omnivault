import type { Metadata } from 'next'
import './colors.css'
import './globals.css'
import 'github-markdown-css/github-markdown.css'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.theme;
                if (t && t !== 'dark') {
                  document.documentElement.setAttribute('data-theme', t)
                } else {
                  document.documentElement.removeAttribute('data-theme')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <div className="bg-mesh" aria-hidden="true" />
        <div className="bg-grid" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}

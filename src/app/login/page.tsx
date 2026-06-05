'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-vault-icon">🔐</div>
        <h1 className="login-title">OmniVault</h1>
        <p className="login-sub">
          Your private, cloud-native archive for all important media, links, and documents.
          Protected &amp; encrypted, accessible only by you.
        </p>

        <button
          id="google-signin-btn"
          className="btn-google"
          onClick={() => signIn('google', { callbackUrl: '/' })}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <path fill="#4285F4" d="M47.5 24.5c0-1.6-.15-3.2-.42-4.7H24v9h13.2c-.56 3-2.3 5.55-4.9 7.27v6.03h7.93c4.64-4.27 7.27-10.57 7.27-17.6z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.14 15.9-5.83l-7.93-6.03C30.06 37.5 27.2 38.5 24 38.5c-6.27 0-11.58-4.23-13.48-9.93H2.4v6.2C6.36 42.82 14.6 48 24 48z"/>
            <path fill="#FBBC05" d="M10.52 28.57A14.46 14.46 0 0 1 9.98 24c0-1.58.27-3.12.54-4.57v-6.2H2.4A23.93 23.93 0 0 0 0 24c0 3.86.93 7.5 2.4 10.77l8.12-6.2z"/>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.6l6.88-6.88C36.02 2.35 30.58 0 24 0 14.6 0 6.36 5.18 2.4 13.23l8.12 6.2C12.42 13.73 17.73 9.5 24 9.5z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Access is restricted to authorized accounts only.
        </p>
      </div>
    </div>
  )
}

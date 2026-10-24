import { useState } from 'react'
import LoginModal from './LoginModal'

interface AuthGateProps {
  title: string
  description: string
  variant?: 'light' | 'dark'
  onLoginSuccess: () => void
}

/**
 * Full-page sign-in gate for operational views. Appwrite collection
 * permissions enforce the same boundary server-side (`read("users")`), so
 * this is UX, not the security boundary.
 */
export default function AuthGate({
  title,
  description,
  variant = 'light',
  onLoginSuccess,
}: AuthGateProps) {
  const [showLogin, setShowLogin] = useState(false)
  const dark = variant === 'dark'

  return (
    <div
      className={
        dark
          ? 'flex min-h-screen items-center justify-center bg-beacon-dark px-4 py-16 font-mono text-white'
          : 'flex min-h-[60vh] items-center justify-center px-4 py-16'
      }
    >
      <div
        className={
          dark
            ? 'w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900/60 p-8 text-center shadow-2xl'
            : 'w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm'
        }
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-beacon-red/10">
          <svg
            className="h-8 w-8 text-beacon-red"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="48" fill="currentColor" />
            <path
              d="M50 20 L50 55 M35 40 L50 55 L65 40"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="70" r="6" fill="white" />
          </svg>
        </div>

        <h1 className={dark ? 'text-2xl font-bold tracking-tight' : 'text-2xl font-bold text-gray-900'}>
          {title}
        </h1>
        <p className={dark ? 'mt-3 text-sm leading-6 text-gray-400' : 'mt-3 text-sm leading-6 text-gray-600'}>
          {description}
        </p>

        <button
          onClick={() => setShowLogin(true)}
          className="mt-7 w-full rounded-lg bg-beacon-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 focus:ring-offset-beacon-dark"
        >
          Sign in to continue
        </button>

        <p className={dark ? 'mt-4 text-xs text-gray-500' : 'mt-4 text-xs text-gray-500'}>
          New responder? Create an account from the sign-in dialog.
        </p>
      </div>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={onLoginSuccess}
      />
    </div>
  )
}

import { useState } from 'react'
import { functions, APPWRITE_CONFIG } from '../lib/appwrite'

interface ResetModalProps {
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
  onResetComplete: () => void
}

export default function ResetModal({ isOpen, onClose, isAdmin, onResetComplete }: ResetModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [step, setStep] = useState<'confirm' | 'executing' | 'success'>('confirm')

  const CONFIRM_PHRASE = 'RESET DEMO DATA'

  const handleReset = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      setError(`Please type "${CONFIRM_PHRASE}" to confirm`)
      return
    }

    if (!isAdmin) {
      setError('Administrator privileges required')
      return
    }

    if (!functions || !APPWRITE_CONFIG.isConfigured) {
      setError('Appwrite not configured')
      return
    }

    setStep('executing')
    setError(null)
    setIsLoading(true)

    try {
      const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_RESET_ID
      if (!functionId || functionId.startsWith('your-')) {
        throw new Error('Reset function is not configured')
      }
      await functions.createExecution(functionId, '{}', false)

      setStep('success')
      onResetComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed'
      setError(message)
      setStep('confirm')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="reset-modal-title" className="text-xl font-bold text-white">
            Reset Demo Data
          </h2>
          <button
            onClick={onClose}
            disabled={step === 'executing'}
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'confirm' && (
          <>
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm mb-2">
                <strong>Warning:</strong> This will permanently delete all incidents, claims, events, and reset supplies to defaults.
              </p>
              <p className="text-red-400 text-sm">This action cannot be undone.</p>
            </div>

            {!isAdmin && (
              <div className="mb-4 p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
                Administrator privileges required. Current user is not an admin.
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="confirm-input" className="block text-sm font-medium text-gray-300 mb-2">
                Type "{CONFIRM_PHRASE}" to confirm:
              </label>
              <input
                id="confirm-input"
                type="text"
                value={confirmText}
                onChange={e => { setConfirmText(e.target.value); setError(null) }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                disabled={!isAdmin}
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm" role="alert">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={!isAdmin || confirmText !== CONFIRM_PHRASE || isLoading}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Resetting…' : 'Reset Demo Data'}
              </button>
            </div>
          </>
        )}

        {step === 'executing' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Resetting database and supplies...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-white font-medium mb-1">Reset Complete!</p>
            <p className="text-sm text-gray-400">All data has been successfully restored to defaults.</p>
          </div>
        )}
      </div>
    </div>
  )
}

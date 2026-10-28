'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Password bhul gaye?</h1>
        <p className="text-gray-500 text-sm mb-6">
          Apna staff email likho. Agar wo registered hai, to password badalne ka link us par aayega.
        </p>

        {sent ? (
          <div className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg text-sm">
            Link bhej diya gaya (agar ye email registered hai). Email check karo, spam folder bhi dekho. Link
            usi browser me kholna jisme ye page khula hai.
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <p className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm">{error}</p>
            )}
            <input
              type="email"
              placeholder="aapka@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Bhej raha hai...' : 'Reset link bhejo'}
            </button>
          </form>
        )}

        <p className="text-sm text-center mt-6">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Login par wapas jao
          </Link>
        </p>
      </div>
    </div>
  )
}
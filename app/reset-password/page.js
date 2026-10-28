'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const t = setTimeout(() => setTimedOut(true), 6000)
    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password kam se kam 8 akshar ka rakho')
      return
    }
    if (password !== confirm) {
      setError('Dono password ek jaise nahi hain')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const inputCls =
    'w-full border border-gray-300 text-gray-900 placeholder-gray-400 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Naya password banao</h1>

        {!ready && !timedOut && <p className="text-gray-500 text-sm mt-4">Link check ho raha hai...</p>}

        {!ready && timedOut && (
          <div className="mt-4">
            <p className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg text-sm mb-4">
              Ye link kaam nahi kar raha. Wajah: link purana ho gaya, ya alag browser me khola. Naya link mangao aur
              usi browser me kholo jisme mangaya tha.
            </p>
            <Link href="/forgot-password" className="text-indigo-600 hover:underline text-sm">
              Naya reset link mangao
            </Link>
          </div>
        )}

        {ready && (
          <form onSubmit={submit} className="mt-4">
            {error && (
              <p className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm">{error}</p>
            )}
            <input
              type="password"
              placeholder="Naya password (8+ akshar)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />
            <input
              type="password"
              placeholder="Password dobara likho"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Save ho raha hai...' : 'Password badlo'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
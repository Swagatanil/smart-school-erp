'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [tab, setTab] = useState('staff')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const switchTab = (t) => {
    setTab(t)
    setError('')
  }

  const handleStaffLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleParentLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.rpc('parent_portal', {
      p_mobile: mobile.trim(),
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setError('Ye mobile number kisi student se linked nahi hai. Sahi number check karo.')
      setLoading(false)
      return
    }

    localStorage.setItem('parentMobile', mobile.trim())
    router.push('/parent-dashboard')
  }

  const inputClass =
    'w-full border border-gray-300 text-gray-900 placeholder-gray-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏫</div>
          <h1 className="text-3xl font-bold text-gray-800">School ERP</h1>
          <p className="text-gray-500 mt-1">Apna login type choose karo</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => switchTab('staff')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
              tab === 'staff' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600'
            }`}
          >
            👩‍🏫 Staff
          </button>
          <button
            type="button"
            onClick={() => switchTab('parent')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
              tab === 'parent' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600'
            }`}
          >
            👨‍👩‍👧 Parent
          </button>
        </div>

        {error && (
          <p className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm">
            {error}
          </p>
        )}

        {tab === 'staff' ? (
          <form onSubmit={handleStaffLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="aapka@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Staff Login'}
            </button>
            <p className="text-sm text-center mt-6 text-gray-600">
              Account nahi hai?{' '}
              <a href="/signup" className="text-indigo-600 font-medium hover:underline">
                Signup karo
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleParentLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registered Mobile Number
              </label>
              <input
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={inputClass}
                required
              />
              <p className="text-xs text-gray-400 mt-2">
                Wahi number daalo jo school me bachche ke admission ke time diya tha.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white p-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Checking...' : "View My Child's Details"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
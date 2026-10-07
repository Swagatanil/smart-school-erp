'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ParentLoginPage() {
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('parent_contact', mobile)

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

    localStorage.setItem('parentMobile', mobile)
    router.push('/parent-dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500 px-4">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">👨‍👩‍👧</div>
          <h1 className="text-3xl font-bold text-gray-800">Parent Login</h1>
          <p className="text-gray-500 mt-1">Apna registered mobile number daalo</p>
        </div>

        {error && (
          <p className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        <input
          type="tel"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white p-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'View My Child\'s Details'}
        </button>
      </form>
    </div>
  )
}
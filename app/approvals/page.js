'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

const ROLES = ['Teacher', 'Accountant', 'Support Staff', 'Admin Staff', 'Principal']

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

export default function ApprovalsPage() {
  const [list, setList] = useState([])
  const [forms, setForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('pending_signups')
    if (error) {
      setError(error.message)
    } else {
      setList(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getForm = (id) => forms[id] || { name: '', role: 'Teacher', subject: '', contact: '' }
  const setField = (id, key, val) =>
    setForms((prev) => ({ ...prev, [id]: { ...getForm(id), [key]: val } }))

  const approve = async (u) => {
    setError('')
    setMessage('')
    const f = getForm(u.id)
    if (!f.name.trim()) {
      setError('Pehle is insaan ka poora naam likho')
      return
    }
    if (
      (f.role === 'Principal' || f.role === 'Admin Staff') &&
      !window.confirm(`${f.role} ko poora access milta hai (sab data aur settings). Pakka approve karna hai?`)
    ) {
      return
    }

    setBusyId(u.id)
    const { error } = await supabase.rpc('approve_signup', {
      p_email: u.email,
      p_name: f.name,
      p_role: f.role,
      p_subject: f.subject,
      p_contact: f.contact,
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage(`${u.email} ko ${f.role} bana diya. Unse bolo logout karke dobara login karein.`)
      await load()
    }
    setBusyId(null)
  }

  const reject = async (u) => {
    if (!window.confirm(`${u.email} ka signup hata dein? Wo dobara signup kar sakta hai.`)) return
    setError('')
    setMessage('')
    setBusyId(u.id)
    const { error } = await supabase.rpc('reject_signup', { p_user_id: u.id })
    if (error) {
      setError(error.message)
    } else {
      setMessage(`${u.email} ka signup hata diya.`)
      await load()
    }
    setBusyId(null)
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white placeholder-gray-400 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-orange-700">🔔 Signup Approvals</h1>
          <Link href="/staff" className="text-indigo-600 hover:underline text-sm font-medium">
            Staff list →
          </Link>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Jinhone signup kiya hai par abhi staff me nahi hain, wo yahan dikhte hain. Approve karte hi wo Staff list me
          chale jate hain aur unka role ke hisaab se access shuru ho jata hai.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            {message}
          </p>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Koi approval baaki nahi hai 🎉</p>
        ) : (
          list.map((u) => {
            const f = getForm(u.id)
            const verified = !!u.email_confirmed_at
            return (
              <div key={u.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-4">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 break-all">{u.email}</div>
                    <div className="text-xs text-gray-500">Signup: {fmt(u.created_at)}</div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {verified ? 'Email verified' : 'Email verify nahi hua'}
                  </span>
                </div>

                {!verified && (
                  <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                    Jab tak ye apna email verify nahi karta, approve nahi ho sakta.
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Poora naam (zaroori)"
                    value={f.name}
                    onChange={(e) => setField(u.id, 'name', e.target.value)}
                    className={inputCls}
                  />
                  <select
                    value={f.role}
                    onChange={(e) => setField(u.id, 'role', e.target.value)}
                    className={inputCls}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Subject (Teacher ke liye)"
                    value={f.subject}
                    onChange={(e) => setField(u.id, 'subject', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Contact number"
                    value={f.contact}
                    onChange={(e) => setField(u.id, 'contact', e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => approve(u)}
                    disabled={busyId !== null || !verified}
                    className="flex-1 bg-green-600 text-white p-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {busyId === u.id ? 'Ho raha hai...' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => reject(u)}
                    disabled={busyId !== null}
                    className="px-5 border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
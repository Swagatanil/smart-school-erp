'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { refreshSchool } from '@/lib/useSchool'

const MAX_SIDE = 200

const resizeLogo = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      let out = canvas.toDataURL('image/png')
      if (out.length > 150000) {
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        out = canvas.toDataURL('image/jpeg', 0.85)
      }
      resolve(out)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Ye image khul nahi payi. PNG ya JPG try karo.'))
    }
    img.src = url
  })

export default function SchoolSettingsPage() {
  const [form, setForm] = useState({
    school_name: '',
    address: '',
    phone: '',
    email: '',
    principal_name: '',
    logo_data: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) setError(error.message)
      else if (data) {
        setForm({
          school_name: data.school_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          principal_name: data.principal_name || '',
          logo_data: data.logo_data || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setMessage('')
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo 5 MB se badi hai. Chhoti photo chuno.')
      return
    }
    try {
      set('logo_data', await resizeLogo(file))
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!form.school_name.trim()) {
      setError('School ka naam likhna zaroori hai')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('school_settings').upsert(
      {
        id: 1,
        school_name: form.school_name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        principal_name: form.principal_name.trim() || null,
        logo_data: form.logo_data || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    if (error) {
      setError(error.message)
    } else {
      await refreshSchool()
      setMessage('Settings save ho gayi. Ab har page par naya naam aur logo dikhega.')
    }
    setSaving(false)
  }

  const inputCls =
    'w-full border border-gray-300 text-gray-900 bg-white placeholder-gray-400 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">⚙️ School Settings</h1>
        <p className="text-gray-500 text-sm mb-6">
          Yahan ek baar bharo. Navbar, certificate, fee receipt, report card aur WhatsApp messages me yahi naam aur
          logo lagega.
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
        ) : (
          <form onSubmit={save} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-4">
            <div className="flex items-center gap-4 bg-indigo-700 text-white rounded-lg p-3">
              {form.logo_data ? (
                <img src={form.logo_data} alt="" className="h-10 w-10 rounded object-contain bg-white" />
              ) : (
                <span className="text-3xl">🏫</span>
              )}
              <span className="font-bold text-lg truncate">{form.school_name || 'School ka naam'}</span>
            </div>
            <p className="text-xs text-gray-500 -mt-2">Upar Navbar me aisa dikhega.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School ka naam *</label>
              <input
                type="text"
                value={form.school_name}
                onChange={(e) => set('school_name', e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                rows="2"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal ka naam</label>
              <input
                type="text"
                value={form.principal_name}
                onChange={(e) => set('principal_name', e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onLogo}
                className="text-sm text-gray-700"
              />
              {form.logo_data && (
                <button
                  type="button"
                  onClick={() => set('logo_data', '')}
                  className="ml-3 text-sm text-red-600 hover:underline"
                >
                  Logo hatao
                </button>
              )}
              <p className="text-xs text-gray-500 mt-1">
                PNG ya JPG, 5 MB tak. Logo apne aap chhota (200px) ho jata hai. Save dabane par hi lagta hai.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
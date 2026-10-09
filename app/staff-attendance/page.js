'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StaffAttendancePage() {
  const [staff, setStaff] = useState([])
  const [date, setDate] = useState(todayStr())
  const [absent, setAbsent] = useState({})
  const [alreadySaved, setAlreadySaved] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, subject, contact')
        .order('name')
      if (error) setError(error.message)
      else setStaff(data)
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      setMessage('')
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('staff_id, status')
        .eq('date', date)
      if (error) {
        setError(error.message)
        return
      }
      const map = {}
      data.forEach((a) => {
        if (a.status === 'Absent') map[a.staff_id] = true
      })
      setAbsent(map)
      setAlreadySaved(data.length > 0)
    }
    load()
  }, [date])

  const toggle = (id) =>
    setAbsent((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })

  const handleSave = async () => {
    if (staff.length === 0) return
    setSaving(true)
    setError('')
    setMessage('')

    const records = staff.map((s) => ({
      staff_id: s.id,
      date,
      status: absent[s.id] ? 'Absent' : 'Present',
    }))

    const { error } = await supabase
      .from('staff_attendance')
      .upsert(records, { onConflict: 'staff_id,date' })

    if (error) {
      setError(error.message)
    } else {
      setAlreadySaved(true)
      const a = records.filter((r) => r.status === 'Absent').length
      setMessage(`Staff attendance save ho gayi! Present: ${records.length - a}, Absent: ${a}`)
    }
    setSaving(false)
  }

  const total = staff.length
  const absentCount = staff.filter((s) => absent[s.id]).length
  const presentCount = total - absentCount
  const presentPct = total > 0 ? Math.round((presentCount / total) * 100) : null

  const shown = staff.filter((s) => {
    const t = search.toLowerCase()
    return s.name?.toLowerCase().includes(t) || s.role?.toLowerCase().includes(t)
  })

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-purple-700">👩‍🏫 Staff Attendance</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm font-medium">
            ← Dashboard
          </Link>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Sab default <strong>Present</strong> hain. Sirf <strong>absent</strong> wale par tick lagao.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            {message}
          </p>
        )}
        {!alreadySaved && staff.length > 0 && (
          <p className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg mb-4 text-sm">
            Is date ki attendance abhi save nahi hui. Save dabane par sab Present aur tick wale Absent save honge.
          </p>
        )}

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 font-medium">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 text-gray-900 p-1 rounded-lg text-sm"
            />
          </div>
          <input
            type="text"
            placeholder="🔍 Naam ya role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 text-gray-900 placeholder-gray-400 p-1 rounded-lg text-sm flex-1 min-w-40"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-indigo-50 text-indigo-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-sm font-medium">Total</div>
          </div>
          <div className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{presentCount}</div>
            <div className="text-sm font-medium">Present</div>
          </div>
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{absentCount}</div>
            <div className="text-sm font-medium">Absent</div>
          </div>
          <div className="bg-purple-50 text-purple-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{presentPct === null ? '—' : presentPct + '%'}</div>
            <div className="text-sm font-medium">Present %</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {shown.map((s) => (
            <label
              key={s.id}
              className={`flex items-center justify-between p-3 border-t border-gray-100 first:border-t-0 cursor-pointer ${
                absent[s.id] ? 'bg-red-50' : ''
              }`}
            >
              <div>
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500">
                  {s.role}
                  {s.subject ? ` (${s.subject})` : ''}
                  {s.contact ? ` • ${s.contact}` : ''}
                </div>
              </div>
              <span className="flex items-center gap-2 text-sm">
                <span className={absent[s.id] ? 'text-red-700 font-semibold' : 'text-gray-400'}>Absent</span>
                <input
                  type="checkbox"
                  checked={!!absent[s.id]}
                  onChange={() => toggle(s.id)}
                  className="w-5 h-5 accent-red-600"
                />
              </span>
            </label>
          ))}
          {shown.length === 0 && <p className="p-4 text-center text-gray-400">Koi staff nahi mila</p>}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || staff.length === 0}
          className="mt-6 w-full bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : `Save Staff Attendance (${presentCount} Present, ${absentCount} Absent)`}
        </button>
      </div>
    </div>
  )
}
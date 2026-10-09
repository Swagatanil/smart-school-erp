'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TABS = [
  { key: 'all', label: 'Sab' },
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'notmarked', label: 'Mark nahi hui' },
]

export default function StaffAttendancePage() {
  const [staff, setStaff] = useState([])
  const [date, setDate] = useState(todayStr())
  const [statusMap, setStatusMap] = useState({})
  const [view, setView] = useState('all')
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
        map[a.staff_id] = a.status
      })
      setStatusMap(map)
    }
    load()
  }, [date])

  const mark = (id, status) => setStatusMap((prev) => ({ ...prev, [id]: status }))

  const markAllPresent = () => {
    const map = {}
    staff.forEach((s) => {
      map[s.id] = 'Present'
    })
    setStatusMap(map)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    const records = staff
      .filter((s) => statusMap[s.id])
      .map((s) => ({ staff_id: s.id, date, status: statusMap[s.id] }))

    if (records.length === 0) {
      setMessage('Koi attendance mark nahi ki gayi.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('staff_attendance')
      .upsert(records, { onConflict: 'staff_id,date' })

    if (error) setError(error.message)
    else setMessage('Staff attendance save ho gayi!')
    setSaving(false)
  }

  const present = staff.filter((s) => statusMap[s.id] === 'Present').length
  const absent = staff.filter((s) => statusMap[s.id] === 'Absent').length
  const marked = present + absent
  const notMarked = staff.length - marked
  const presentPct = marked > 0 ? Math.round((present / marked) * 100) : null

  const shown = staff.filter((s) => {
    const st = statusMap[s.id]
    if (view === 'present') return st === 'Present'
    if (view === 'absent') return st === 'Absent'
    if (view === 'notmarked') return !st
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-purple-700">👩‍🏫 Staff Attendance</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm font-medium">
            ← Dashboard
          </Link>
        </div>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            {message}
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
          <button onClick={markAllPresent} className="text-purple-700 hover:underline text-sm font-medium">
            Sabko Present mark karo
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 text-purple-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{presentPct === null ? '—' : presentPct + '%'}</div>
            <div className="text-sm font-medium">Present %</div>
          </div>
          <div className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{present}</div>
            <div className="text-sm font-medium">Present</div>
          </div>
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{absent}</div>
            <div className="text-sm font-medium">Absent</div>
          </div>
          <div className="bg-gray-100 text-gray-700 rounded-xl p-4 text-center shadow-md">
            <div className="text-3xl font-bold">{notMarked}</div>
            <div className="text-sm font-medium">Mark nahi hui</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-4 py-1 rounded-full text-sm font-semibold border transition ${
                view === t.key
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-purple-50 text-purple-800">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="border-t border-gray-200">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">
                    {s.role}
                    {s.subject ? ` (${s.subject})` : ''}
                  </td>
                  <td className="p-3">{s.contact}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => mark(s.id, 'Present')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                        statusMap[s.id] === 'Present'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => mark(s.id, 'Absent')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                        statusMap[s.id] === 'Absent'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      Absent
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-400">
                    Koi staff nahi mila
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Staff Attendance'}
        </button>
      </div>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'
import ClassPicker from '@/components/ClassPicker'

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

export default function AttendanceReportPage() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [view, setView] = useState('all')
  const [students, setStudents] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'present' || v === 'absent') setView(v)

    const loadClasses = async () => {
      try {
        const rows = await fetchAll(() => supabase.from('students').select('id, class'))
        const list = [...new Set(rows.map((r) => r.class).filter(Boolean))].sort((a, b) =>
          String(a).localeCompare(String(b), undefined, { numeric: true })
        )
        setClasses(list)
      } catch (e) {
        setError(e.message)
      }
    }
    loadClasses()
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    const load = async () => {
      setLoading(true)
      setError('')
      const { data: st, error: e1 } = await supabase
        .from('students')
        .select('id, name, section, roll_number')
        .eq('class', selectedClass)
        .order('name')
      if (e1) {
        setError(e1.message)
        setLoading(false)
        return
      }
      setStudents(st)

      const map = {}
      const ids = st.map((s) => s.id)
      if (ids.length > 0) {
        const { data: att, error: e2 } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', date)
          .in('student-id', ids)
        if (e2) {
          setError(e2.message)
          setLoading(false)
          return
        }
        att.forEach((a) => {
          map[a['student-id']] = a.status
        })
      }
      setStatusMap(map)
      setLoading(false)
    }
    load()
  }, [selectedClass, date])

  const present = students.filter((s) => statusMap[s.id] === 'Present').length
  const absent = students.filter((s) => statusMap[s.id] === 'Absent').length
  const marked = present + absent
  const notMarked = students.length - marked
  const presentPct = marked > 0 ? Math.round((present / marked) * 100) : null

  const shown = students.filter((s) => {
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
          <h1 className="text-3xl font-bold text-indigo-700">📅 Attendance Report</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm font-medium">
            ← Dashboard
          </Link>
        </div>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        {!selectedClass ? (
          <ClassPicker
            classes={classes}
            onPick={setSelectedClass}
            title="Kis class ka attendance dekhna hai?"
            hint="Class chuno, phir us class ka Present % aur list dikhegi."
          />
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap items-center gap-4">
              <span className="font-bold text-gray-800">Class {selectedClass}</span>
              <button
                onClick={() => {
                  setSelectedClass(null)
                  setStudents([])
                  setStatusMap({})
                }}
                className="text-indigo-600 hover:underline text-sm"
              >
                Class badlo
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-gray-700 font-medium">Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-gray-300 text-gray-900 p-1 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
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
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-gray-900">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => {
                    const st = statusMap[s.id]
                    return (
                      <tr key={s.id} className="border-t border-gray-200">
                        <td className="p-3">{s.name}</td>
                        <td className="p-3">{s.section}</td>
                        <td className="p-3">{s.roll_number}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              st === 'Present'
                                ? 'bg-green-100 text-green-700'
                                : st === 'Absent'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {st || 'Mark nahi hui'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {!loading && shown.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-gray-400">
                        Koi student nahi mila
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
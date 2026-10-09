'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })

const getSections = (students) =>
  [...new Set(students.map((s) => s.section).filter(Boolean))].sort(natural)

const pickStudents = (students, section) => {
  const secs = getSections(students)
  if (secs.length > 1) {
    if (!section) return []
    return students.filter((s) => (s.section || '') === section)
  }
  return students
}

export default function AttendancePage() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [section, setSection] = useState('')
  const [date, setDate] = useState(todayStr())
  const [students, setStudents] = useState([])
  const [absentText, setAbsentText] = useState('')
  const [alreadySaved, setAlreadySaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const sections = getSections(students)
  const classStudents = pickStudents(students, section)

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const rows = await fetchAll(() => supabase.from('students').select('id, class'))
        setClasses([...new Set(rows.map((r) => r.class).filter(Boolean))].sort(natural))
      } catch (e) {
        setError(e.message)
      }
    }
    loadClasses()
  }, [])

  useEffect(() => {
    setStudents([])
    setSection('')
    setAbsentText('')
    setMessage('')
    setError('')
    setAlreadySaved(false)
    if (!selectedClass) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('id, name, section, roll_number')
        .eq('class', selectedClass)
        .order('name')
      if (error) setError(error.message)
      else setStudents(data)
      setLoading(false)
    }
    load()
  }, [selectedClass])

  useEffect(() => {
    setMessage('')
    setAbsentText('')
    setAlreadySaved(false)
    const list = pickStudents(students, section)
    if (list.length === 0) return
    const load = async () => {
      const ids = list.map((s) => s.id)
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .in('student-id', ids)
      if (error) {
        setError(error.message)
        return
      }
      if (data.length > 0) {
        setAlreadySaved(true)
        const absIds = new Set(data.filter((a) => a.status === 'Absent').map((a) => a['student-id']))
        setAbsentText(
          list
            .filter((s) => absIds.has(s.id))
            .map((s) => s.roll_number || '')
            .filter(Boolean)
            .join(', ')
        )
      }
    }
    load()
  }, [students, section, date])

  // ---- live preview ----
  const tokens = [
    ...new Set(
      absentText
        .split(/[\s,;]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
  const rollMap = {}
  classStudents.forEach((s) => {
    const r = String(s.roll_number || '').trim().toLowerCase()
    if (!r) return
    if (!rollMap[r]) rollMap[r] = []
    rollMap[r].push(s)
  })
  const absentStudents = []
  const unknown = []
  const ambiguous = []
  tokens.forEach((t) => {
    const m = rollMap[t]
    if (!m) unknown.push(t)
    else if (m.length > 1) ambiguous.push(t)
    else absentStudents.push(m[0])
  })

  const absentIds = new Set(absentStudents.map((s) => s.id))
  const ambiguousSet = new Set(ambiguous)

  const sortedStudents = [...classStudents].sort((a, b) => {
    const ra = String(a.roll_number || '').trim()
    const rb = String(b.roll_number || '').trim()
    if (!ra && !rb) return String(a.name).localeCompare(String(b.name))
    if (!ra) return 1
    if (!rb) return -1
    return natural(ra, rb)
  })

  const total = classStudents.length
  const absentCount = absentStudents.length
  const presentCount = total - absentCount
  const presentPct = total > 0 ? Math.round((presentCount / total) * 100) : null
  const noRoll = classStudents.filter((s) => !String(s.roll_number || '').trim()).length
  const hasProblem = unknown.length > 0 || ambiguous.length > 0
  const needSection = sections.length > 1 && !section

  const handleSave = async () => {
    if (hasProblem || total === 0) return
    setSaving(true)
    setError('')
    setMessage('')

    const ids = classStudents.map((s) => s.id)

    const { error: delErr } = await supabase
      .from('attendance')
      .delete()
      .eq('date', date)
      .in('student-id', ids)
    if (delErr) {
      setError(delErr.message)
      setSaving(false)
      return
    }

    const rows = classStudents.map((s) => ({
      'student-id': s.id,
      date,
      status: absentIds.has(s.id) ? 'Absent' : 'Present',
    }))

    for (let i = 0; i < rows.length; i += 500) {
      const { error: insErr } = await supabase.from('attendance').insert(rows.slice(i, i + 500))
      if (insErr) {
        setError(insErr.message + ' (Dobara Save dabao)')
        setSaving(false)
        return
      }
    }

    setAlreadySaved(true)
    setMessage(`Attendance save ho gayi! Present: ${presentCount}, Absent: ${absentCount}`)
    setSaving(false)
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">📅 Attendance</h1>
        <p className="text-gray-500 text-sm mb-6">
          Sirf <strong>absent</strong> bachchon ke roll number likho. Baaki sab apne aap Present ho jayenge, aur absent
          bachche ka naam neeche list me laal ho jayega.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            {message}
          </p>
        )}

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputCls}>
              <option value="">Class chuno</option>
              {classes.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
          {sections.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)} className={inputCls}>
                <option value="">Section chuno</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!selectedClass && <p className="text-center text-gray-400 py-12">Pehle class chuno</p>}
        {selectedClass && loading && <p className="text-center text-gray-400 py-12">Loading...</p>}
        {selectedClass && !loading && needSection && (
          <p className="text-center text-gray-400 py-12">Ab section chuno</p>
        )}
        {selectedClass && !loading && !needSection && total === 0 && (
          <p className="text-center text-gray-400 py-12">Is class me koi student nahi hai</p>
        )}

        {total > 0 && (
          <>
            {alreadySaved && (
              <p className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg mb-4 text-sm">
                Is date ki attendance pehle save ho chuki hai. Neeche purane absent roll numbers dikh rahe hain.
                Badal ke dobara Save karoge to update ho jayegi.
              </p>
            )}

            {noRoll > 0 && (
              <p className="bg-orange-50 text-orange-800 border border-orange-200 p-3 rounded-lg mb-4 text-sm">
                ⚠️ {noRoll} student(s) ka roll number nahi hai, wo hamesha Present maane jayenge. Students page se
                roll number bhar do.
              </p>
            )}

            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Absent bachchon ke roll number (comma ya space se alag karo)
              </label>
              <textarea
                value={absentText}
                onChange={(e) => setAbsentText(e.target.value)}
                placeholder="jaise: 3, 7, 12, 25"
                rows="2"
                className={`w-full ${inputCls} placeholder-gray-400`}
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
              <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{presentPct === null ? '—' : presentPct + '%'}</div>
                <div className="text-sm font-medium">Present %</div>
              </div>
            </div>

            {unknown.length > 0 && (
              <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-3 text-sm">
                ❌ Ye roll number is class/section me nahi mile: <strong>{unknown.join(', ')}</strong>
              </p>
            )}
            {ambiguous.length > 0 && (
              <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-3 text-sm">
                ❌ Ye roll number ek se zyada students ke hain: <strong>{ambiguous.join(', ')}</strong>. Students page
                me roll number theek karo.
              </p>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">
                  Class {selectedClass}
                  {section ? ` - ${section}` : ''} ki list
                </h3>
                <span className="text-xs text-gray-500">
                  <span className="text-red-600 font-semibold">Laal</span> = Absent
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {sortedStudents.map((s) => {
                  const roll = String(s.roll_number || '').trim()
                  const isAbsent = absentIds.has(s.id)
                  const isDup = !isAbsent && roll && ambiguousSet.has(roll.toLowerCase())
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between px-4 py-2 border-t border-gray-100 first:border-t-0 text-sm ${
                        isAbsent ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-10 text-right ${isAbsent ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          {roll || '—'}
                        </span>
                        <span className={isAbsent ? 'text-red-600 font-bold' : 'text-gray-900'}>{s.name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isAbsent
                            ? 'bg-red-100 text-red-700'
                            : isDup
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isAbsent ? 'Absent' : isDup ? 'Roll repeat' : 'Present'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || hasProblem}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save Attendance (${presentCount} Present, ${absentCount} Absent)`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
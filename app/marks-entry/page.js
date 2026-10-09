'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const PRESETS = ['Hindi', 'English', 'Maths', 'Science', 'Social Science', 'Computer']

const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
const norm = (v) => String(v ?? '').trim().toLowerCase()
const rollOf = (s) => String(s.roll_number || '').trim()

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

const badValue = (v, sub) => {
  const t = String(v ?? '').trim()
  if (t === '') return false
  const n = Number(t.replace(',', '.'))
  const max = Number(sub.max)
  return Number.isNaN(n) || n < 0 || (max > 0 && n > max)
}

export default function MarksEntryPage() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [section, setSection] = useState('')
  const [students, setStudents] = useState([])
  const [examName, setExamName] = useState('')
  const [examList, setExamList] = useState([])

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetStudents, setSheetStudents] = useState([])
  const [sheetExam, setSheetExam] = useState('')
  const [subjects, setSubjects] = useState([])
  const [values, setValues] = useState({})
  const [customName, setCustomName] = useState('')
  const [dirty, setDirty] = useState(false)

  const [loadingStudents, setLoadingStudents] = useState(false)
  const [opening, setOpening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const idRef = useRef(1)
  const supabase = createClient()

  const sections = getSections(students)
  const classStudents = pickStudents(students, section)
  const needSection = sections.length > 1 && !section

  const loadExamList = async () => {
    try {
      const rows = await fetchAll(() => supabase.from('marks').select('id, exam_name'))
      const seen = {}
      rows.forEach((r) => {
        const k = norm(r.exam_name)
        if (k && !seen[k]) seen[k] = String(r.exam_name).trim()
      })
      setExamList(Object.values(seen).sort(natural))
    } catch (e) {
      // exam list na mile to bhi page chalega
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const rows = await fetchAll(() => supabase.from('students').select('id, class'))
        setClasses([...new Set(rows.map((r) => r.class).filter(Boolean))].sort(natural))
      } catch (e) {
        setError(e.message)
      }
      loadExamList()
    }
    init()
  }, [])

  useEffect(() => {
    setStudents([])
    setSection('')
    if (!selectedClass) return
    const load = async () => {
      setLoadingStudents(true)
      const { data, error } = await supabase
        .from('students')
        .select('id, name, section, roll_number')
        .eq('class', selectedClass)
        .order('name')
      if (error) setError(error.message)
      else setStudents(data)
      setLoadingStudents(false)
    }
    load()
  }, [selectedClass])

  const sortedStudents = [...sheetStudents].sort((a, b) => {
    const ra = rollOf(a)
    const rb = rollOf(b)
    if (!ra && !rb) return String(a.name).localeCompare(String(b.name))
    if (!ra) return 1
    if (!rb) return -1
    return natural(ra, rb)
  })

  const handleOpen = async () => {
    setError('')
    setMessage('')
    if (!selectedClass) {
      setError('Pehle class chuno')
      return
    }
    if (needSection) {
      setError('Section chuno')
      return
    }
    if (!examName.trim()) {
      setError('Exam ka naam likho (jaise Half Yearly)')
      return
    }
    if (classStudents.length === 0) {
      setError('Is class me koi student nahi hai')
      return
    }

    setOpening(true)
    const ids = classStudents.map((s) => s.id)
    const ex = norm(examName)
    let rows = []
    for (let i = 0; i < ids.length; i += 50) {
      const { data, error } = await supabase
        .from('marks')
        .select('*')
        .in('student-id', ids.slice(i, i + 50))
        .ilike('exam_name', `%${examName.trim()}%`)
      if (error) {
        setError(error.message)
        setOpening(false)
        return
      }
      rows = rows.concat(data)
    }
    rows = rows.filter((m) => norm(m.exam_name) === ex).sort((a, b) => a.id - b.id)

    const subs = []
    rows.forEach((m) => {
      const k = norm(m.subject)
      if (!subs.find((s) => norm(s.name) === k)) {
        subs.push({ id: idRef.current++, name: String(m.subject).trim(), max: String(m.max_marks) })
      }
    })
    const vals = {}
    rows.forEach((m) => {
      const sub = subs.find((s) => norm(s.name) === norm(m.subject))
      vals[`${m['student-id']}|${sub.id}`] = String(m.marks_obtained)
    })

    setSheetStudents(classStudents)
    setSheetExam(examName.trim())
    setSubjects(subs)
    setValues(vals)
    setDirty(false)
    setSheetOpen(true)
    if (rows.length > 0) setMessage(`Is exam ke ${rows.length} purane marks load ho gaye.`)
    setOpening(false)
  }

  const closeSheet = () => {
    if (dirty && !window.confirm('Save na kiye hue marks mit jayenge. Pakka?')) return
    setSheetOpen(false)
    setSubjects([])
    setValues({})
    setDirty(false)
    setMessage('')
    setError('')
  }

  const addSubject = (name, max = '100') => {
    const n = name.trim()
    if (!n) return
    if (subjects.some((s) => norm(s.name) === norm(n))) {
      setError(`${n} pehle se sheet me hai`)
      return
    }
    setError('')
    setSubjects((prev) => [...prev, { id: idRef.current++, name: n, max }])
    setDirty(true)
  }

  const removeSubject = (id) => {
    if (!window.confirm('Is subject ka column hata dein? Iske marks sheet se hat jayenge.')) return
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setValues((prev) => {
      const next = {}
      Object.keys(prev).forEach((k) => {
        if (!k.endsWith('|' + id)) next[k] = prev[k]
      })
      return next
    })
    setDirty(true)
  }

  const setMax = (id, v) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, max: v } : s)))
    setDirty(true)
  }

  const setCell = (key, v) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    setDirty(true)
  }

  const focusCell = (r, c) => {
    const el = document.querySelector(`[data-cell="${r}-${c}"]`)
    if (el) {
      el.focus()
      if (el.select) el.select()
    }
  }

  const handleKey = (e, r, c) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusCell(r + 1, c)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusCell(r - 1, c)
    }
  }

  const handlePaste = (e, r, c) => {
    const text = e.clipboardData.getData('text')
    if (!/[\t\n]/.test(text.trim())) return
    e.preventDefault()
    const lines = text.replace(/\r/g, '').split('\n')
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    setValues((prev) => {
      const next = { ...prev }
      lines.forEach((line, i) => {
        const st = sortedStudents[r + i]
        if (!st) return
        line.split('\t').forEach((cell, j) => {
          const sub = subjects[c + j]
          if (!sub) return
          next[`${st.id}|${sub.id}`] = cell.trim()
        })
      })
      return next
    })
    setDirty(true)
  }

  let invalidCount = 0
  sortedStudents.forEach((st) => {
    subjects.forEach((sub) => {
      if (badValue(values[`${st.id}|${sub.id}`], sub)) invalidCount++
    })
  })
  const maxBad = subjects.some((s) => !(Number(s.max) > 0))
  const names = subjects.map((s) => norm(s.name))
  const dupNames = new Set(names).size !== names.length
  const filledCount = (subId) =>
    sortedStudents.filter((st) => String(values[`${st.id}|${subId}`] ?? '').trim() !== '').length

  const handleSave = async () => {
    setError('')
    setMessage('')
    if (subjects.length === 0) {
      setError('Kam se kam ek subject jodo')
      return
    }
    if (dupNames) {
      setError('Do subject ka naam ek jaisa hai')
      return
    }
    if (maxBad) {
      setError('Har subject ke Max marks sahi daalo')
      return
    }
    if (invalidCount > 0) {
      setError(`${invalidCount} cell me marks galat hain (laal cell). Pehle theek karo.`)
      return
    }

    setSaving(true)
    const done = []
    for (const sub of subjects) {
      const rows = sortedStudents.map((st) => {
        const raw = String(values[`${st.id}|${sub.id}`] ?? '').trim().replace(',', '.')
        return { id: st.id, marks: raw === '' ? null : Number(raw) }
      })
      const { error } = await supabase.rpc('save_marks', {
        p_exam: sheetExam,
        p_subject: sub.name.trim(),
        p_max: Number(sub.max),
        p_rows: rows,
      })
      if (error) {
        setError(
          `${sub.name} save nahi hua: ${error.message}` +
            (done.length > 0 ? ` (Ye save ho chuke hain: ${done.join(', ')})` : '')
        )
        setSaving(false)
        return
      }
      done.push(sub.name)
    }
    setDirty(false)
    setMessage(`Marks save ho gaye: ${done.join(', ')}`)
    setSaving(false)
    loadExamList()
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white placeholder-gray-400 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">📝 Marks Entry</h1>
        <p className="text-gray-500 text-sm mb-6">
          Poori class ke marks ek sheet me bharo. Excel se copy karke seedha paste bhi kar sakte ho.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            {message}
          </p>
        )}

        {!sheetOpen && (
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className={inputCls}
                >
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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Exam / Test ka naam</label>
                <input
                  list="exam-list"
                  type="text"
                  placeholder="jaise Half Yearly"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className={inputCls}
                />
                <datalist id="exam-list">
                  {examList.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              <button
                onClick={handleOpen}
                disabled={opening || loadingStudents}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {opening ? 'Khul raha hai...' : 'Sheet kholo'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Exam ka naam har baar ek jaisa likhna (list se chunna sabse safe). Spelling alag hui to wo alag exam
              ban jayega.
            </p>
          </div>
        )}

        {sheetOpen && (
          <>
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-4 flex flex-wrap items-center gap-4">
              <div className="text-sm text-gray-800">
                <strong>Class {selectedClass}</strong>
                {section ? ` - ${section}` : ''} • Exam: <strong>{sheetExam}</strong> • {sortedStudents.length}{' '}
                students
              </div>
              <button onClick={closeSheet} className="ml-auto text-indigo-600 hover:underline text-sm font-medium">
                Class / Exam badlo
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Subject jodo</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESETS.filter((p) => !subjects.some((s) => norm(s.name) === norm(p))).map((p) => (
                  <button
                    key={p}
                    onClick={() => addSubject(p)}
                    className="px-3 py-1 rounded-full border border-indigo-300 text-indigo-700 text-sm hover:bg-indigo-50"
                  >
                    + {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Koi aur subject..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSubject(customName)
                      setCustomName('')
                    }
                  }}
                  className={`flex-1 ${inputCls}`}
                />
                <button
                  onClick={() => {
                    addSubject(customName)
                    setCustomName('')
                  }}
                  className="bg-indigo-600 text-white px-4 rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Jodo
                </button>
              </div>
            </div>

            {subjects.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Upar se subject jodo, phir marks bharo.</p>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-auto max-h-[65vh]">
                  <table className="text-sm text-gray-900 border-collapse">
                    <thead className="bg-indigo-50 text-indigo-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-left">Roll</th>
                        <th className="p-2 text-left min-w-44">Name</th>
                        {subjects.map((sub) => (
                          <th key={sub.id} className="p-2 min-w-28 align-top">
                            <div className="flex items-center justify-between gap-1">
                              <span>{sub.name}</span>
                              <button
                                onClick={() => removeSubject(sub.id)}
                                className="text-red-500 text-xs"
                                title="Subject hatao"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs font-normal">
                              <span>Max</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={sub.max}
                                onChange={(e) => setMax(sub.id, e.target.value)}
                                className={`w-14 p-0.5 rounded border text-center text-gray-900 bg-white ${
                                  Number(sub.max) > 0 ? 'border-gray-300' : 'border-red-500'
                                }`}
                              />
                            </div>
                            <div className="text-[11px] font-normal text-gray-500">
                              {filledCount(sub.id)}/{sortedStudents.length} bhare
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map((st, r) => (
                        <tr key={st.id} className="border-t border-gray-100">
                          <td className="p-2 text-gray-500">{rollOf(st) || '—'}</td>
                          <td className="p-2">{st.name}</td>
                          {subjects.map((sub, c) => {
                            const key = `${st.id}|${sub.id}`
                            const bad = badValue(values[key], sub)
                            return (
                              <td key={sub.id} className="p-1">
                                <input
                                  data-cell={`${r}-${c}`}
                                  type="text"
                                  inputMode="decimal"
                                  value={values[key] ?? ''}
                                  onChange={(e) => setCell(key, e.target.value)}
                                  onKeyDown={(e) => handleKey(e, r, c)}
                                  onPaste={(e) => handlePaste(e, r, c)}
                                  className={`w-24 text-center p-1 rounded border text-gray-900 ${
                                    bad ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                                  }`}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Khali cell = marks nahi bhare (absent bachche ka cell khali chhodo). Pehle se save marks mitane ho
                  to cell khali karke Save karo. Excel se paste karte waqt Excel ki list bhi isi roll number order me
                  honi chahiye.
                </p>

                {invalidCount > 0 && (
                  <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mt-3 text-sm">
                    ❌ {invalidCount} cell me marks galat hain (number nahi hai ya Max se zyada hai).
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || invalidCount > 0}
                  className="mt-4 w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save sab marks (${subjects.length} subject)`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
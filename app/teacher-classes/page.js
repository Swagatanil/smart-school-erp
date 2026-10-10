'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })

export default function TeacherClassesPage() {
  const [teachers, setTeachers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [classMap, setClassMap] = useState({})
  const [staffId, setStaffId] = useState('')
  const [cls, setCls] = useState('')
  const [sec, setSec] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    try {
      const { data: t, error: e1 } = await supabase
        .from('staff')
        .select('id, name, subject, email')
        .eq('role', 'Teacher')
        .order('name')
      if (e1) throw e1

      const { data: a, error: e2 } = await supabase.from('teacher_classes').select('*').order('id')
      if (e2) throw e2

      const st = await fetchAll(() => supabase.from('students').select('id, class, section'))
      const map = {}
      st.forEach((s) => {
        if (!s.class) return
        if (!map[s.class]) map[s.class] = new Set()
        if (s.section) map[s.class].add(s.section)
      })
      const out = {}
      Object.keys(map).forEach((k) => {
        out[k] = [...map[k]].sort(natural)
      })

      setTeachers(t)
      setAssignments(a)
      setClassMap(out)
    } catch (e) {
      setError(e.message || 'Data load nahi hua')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const classes = Object.keys(classMap).sort(natural)

  const add = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!staffId || !cls) {
      setError('Teacher aur class dono chuno')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('teacher_classes')
      .insert([{ staff_id: Number(staffId), class: cls, section: sec }])
    if (error) {
      setError(error.code === '23505' ? 'Ye class is teacher ko pehle se assigned hai' : error.message)
    } else {
      setMessage('Class assign ho gayi')
      await load()
    }
    setSaving(false)
  }

  const remove = async (a) => {
    if (!window.confirm('Ye class is teacher se hata dein?')) return
    setError('')
    setMessage('')
    const { error } = await supabase.from('teacher_classes').delete().eq('id', a.id)
    if (error) setError(error.message)
    else {
      setMessage('Class hata di')
      await load()
    }
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">🏫 Teacher Classes</h1>
        <p className="text-gray-500 text-sm mb-6">
          Har teacher ko wo class do jo wo padhata hai. Teacher ko sirf wahi class ka data dikhega.
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
          <>
            {classes.length === 0 && (
              <p className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg mb-4 text-sm">
                Abhi system me koi student nahi hai. Pehle students add ya import karo, tabhi class chun paoge.
              </p>
            )}

            <form
              onSubmit={add}
              className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3"
            >
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls}>
                <option value="">Teacher chuno</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.subject ? ` (${t.subject})` : ''}
                  </option>
                ))}
              </select>
              <select
                value={cls}
                onChange={(e) => {
                  setCls(e.target.value)
                  setSec('')
                }}
                className={inputCls}
              >
                <option value="">Class chuno</option>
                {classes.map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
              <select value={sec} onChange={(e) => setSec(e.target.value)} className={inputCls}>
                <option value="">Sab sections</option>
                {(classMap[cls] || []).map((s) => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? 'Ho raha hai...' : 'Assign karo'}
              </button>
            </form>

            {teachers.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                Staff me abhi koi Teacher nahi hai. Pehle Staff ya Approvals page se teacher jodo.
              </p>
            )}

            {teachers.map((t) => {
              const mine = assignments.filter((a) => a.staff_id === t.id)
              return (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-3">
                  <div className="font-semibold text-gray-900">
                    {t.name}
                    {t.subject && <span className="text-gray-500 font-normal"> ({t.subject})</span>}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{t.email || 'email nahi hai'}</div>
                  {mine.length === 0 ? (
                    <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2">
                      Koi class assign nahi hai. Ye teacher ko abhi kuch nahi dikhega.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {[...mine]
                        .sort((a, b) => natural(a.class + a.section, b.class + b.section))
                        .map((a) => (
                          <span
                            key={a.id}
                            className="flex items-center gap-2 bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full text-sm"
                          >
                            Class {a.class}
                            {a.section ? ` - ${a.section}` : ' (sab sections)'}
                            <button
                              onClick={() => remove(a)}
                              className="text-red-500 hover:text-red-700"
                              title="Hatao"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
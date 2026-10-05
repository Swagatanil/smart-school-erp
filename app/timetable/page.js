'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function TimetablePage() {
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [entries, setEntries] = useState([])
  const [error, setError] = useState('')

  const [day, setDay] = useState('Monday')
  const [period, setPeriod] = useState('')
  const [subject, setSubject] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const fetchEntries = async () => {
    if (!classFilter) return
    let query = supabase.from('timetable').select('*').eq('class', classFilter)
    if (sectionFilter) query = query.eq('section', sectionFilter)

    const { data, error } = await query
    if (error) {
      setError(error.message)
    } else {
      setEntries(data)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [classFilter, sectionFilter])

  const handleAddEntry = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('timetable').insert([
      {
        class: classFilter,
        section: sectionFilter,
        day,
        period: parseInt(period),
        subject,
        teacher_name: teacherName,
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setPeriod('')
      setSubject('')
      setTeacherName('')
      fetchEntries()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('timetable').delete().eq('id', id)
    if (!error) fetchEntries()
  }

  const getEntry = (day, period) => {
    return entries.find((e) => e.day === day && e.period === period)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">🗓️ Timetable</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Class (e.g. 10)"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Section (e.g. A)"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
        </div>

        {classFilter && (
          <>
            <form
              onSubmit={handleAddEntry}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-5 gap-4"
            >
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
                required
              >
                <option value="">Period</option>
                {PERIODS.map((p) => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
                required
              />

              <input
                type="text"
                placeholder="Teacher Name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
              />

              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Period'}
              </button>
            </form>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-gray-900 text-sm">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="p-3">Period</th>
                    {DAYS.map((d) => (
                      <th key={d} className="p-3">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p) => (
                    <tr key={p} className="border-t border-gray-200">
                      <td className="p-3 font-semibold">Period {p}</td>
                      {DAYS.map((d) => {
                        const entry = getEntry(d, p)
                        return (
                          <td key={d} className="p-3">
                            {entry ? (
                              <div className="bg-indigo-50 rounded-lg p-2">
                                <p className="font-medium">{entry.subject}</p>
                                <p className="text-xs text-gray-500">{entry.teacher_name}</p>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-red-500 text-xs hover:underline mt-1"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!classFilter && (
          <p className="text-center text-gray-400 py-12">
            Upar Class daal ke schedule dekho ya banao
          </p>
        )}
      </div>
    </div>
  )
}
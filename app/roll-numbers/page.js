'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const NONE = '__none__'
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
const rollOf = (s) => String(s.roll_number || '').trim()

export default function RollNumbersPage() {
  const [students, setStudents] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchAll(() =>
        supabase.from('students').select('id, name, class, section, roll_number')
      )
      setStudents(data)
    } catch (e) {
      setError(e.message || 'Data load nahi hua')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const classes = [...new Set(students.map((s) => s.class).filter(Boolean))].sort(natural)
  const inClass = students.filter((s) => s.class === selectedClass)
  const sectionValues = [...new Set(inClass.map((s) => s.section || ''))].sort(natural)

  useEffect(() => {
    setMessage('')
    setError('')
    if (sectionValues.length === 1) {
      setSelectedSection(sectionValues[0] === '' ? NONE : sectionValues[0])
    } else {
      setSelectedSection('')
    }
  }, [selectedClass])

  const sectionReady = selectedClass && selectedSection !== ''
  const sectionValue = selectedSection === NONE ? '' : selectedSection
  const group = sectionReady ? inClass.filter((s) => (s.section || '') === sectionValue) : []

  const missing = group.filter((s) => rollOf(s) === '')
  const counts = {}
  group.forEach((s) => {
    const r = rollOf(s).toLowerCase()
    if (r) counts[r] = (counts[r] || 0) + 1
  })
  const dupRolls = Object.keys(counts).filter((r) => counts[r] > 1)

  const sorted = [...group].sort((a, b) => {
    const ra = rollOf(a)
    const rb = rollOf(b)
    if (!ra && !rb) return String(a.name).localeCompare(String(b.name))
    if (!ra) return 1
    if (!rb) return -1
    return natural(ra, rb)
  })

  const run = async (mode) => {
    if (mode === 'all') {
      const ok = window.confirm(
        `Class ${selectedClass}${sectionValue ? ' - ' + sectionValue : ''} ke sabhi ${group.length} bachchon ko naam ke alphabet order me naye roll number (1 se) milenge. Purane roll number badal jayenge. Pakka karna hai?`
      )
      if (!ok) return
    }
    setWorking(true)
    setError('')
    setMessage('')
    const { data, error } = await supabase.rpc('assign_roll_numbers', {
      p_class: selectedClass,
      p_section: sectionValue,
      p_mode: mode,
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage(`${data} bachchon ko roll number mil gaya.`)
      await load()
    }
    setWorking(false)
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">🔢 Roll Numbers</h1>
        <p className="text-gray-500 text-sm mb-6">
          Class aur section chuno, phir bachchon ko naam ke alphabet order me roll number do.
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
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap gap-4">
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
              {selectedClass && sectionValues.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Section chuno</option>
                    {sectionValues.map((s) => (
                      <option key={s || NONE} value={s === '' ? NONE : s}>
                        {s === '' ? '(section nahi)' : s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!selectedClass && <p className="text-center text-gray-400 py-12">Pehle class chuno</p>}
            {selectedClass && !sectionReady && (
              <p className="text-center text-gray-400 py-12">Ab section chuno</p>
            )}

            {sectionReady && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 text-indigo-700 rounded-xl p-4 text-center shadow-md">
                    <div className="text-3xl font-bold">{group.length}</div>
                    <div className="text-sm font-medium">Students</div>
                  </div>
                  <div className="bg-orange-50 text-orange-700 rounded-xl p-4 text-center shadow-md">
                    <div className="text-3xl font-bold">{missing.length}</div>
                    <div className="text-sm font-medium">Roll no. khali</div>
                  </div>
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
                    <div className="text-3xl font-bold">{dupRolls.length}</div>
                    <div className="text-sm font-medium">Repeat roll no.</div>
                  </div>
                </div>

                {dupRolls.length > 0 && (
                  <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">
                    ❌ Ye roll number ek se zyada bachchon ke hain: <strong>{dupRolls.join(', ')}</strong>. Inhe theek
                    karne ke liye neeche &quot;Sabko naye sire se&quot; chalao.
                  </p>
                )}

                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 space-y-3">
                  <button
                    onClick={() => run('missing')}
                    disabled={working || missing.length === 0}
                    className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {working ? 'Ho raha hai...' : `Sirf khali wale ko number do (${missing.length})`}
                  </button>
                  <p className="text-xs text-gray-500">
                    Jinke roll number hain wo nahi badlenge. Khali wale alphabet order me aage ke number paayenge.
                  </p>
                  <button
                    onClick={() => run('all')}
                    disabled={working || group.length === 0}
                    className="w-full border-2 border-red-300 text-red-700 p-3 rounded-lg font-semibold hover:bg-red-50 transition disabled:opacity-50"
                  >
                    Sabko naye sire se number do (alphabet order)
                  </button>
                  <p className="text-xs text-gray-500">
                    Isse purane roll number badal jayenge. Purani attendance safe rehti hai (wo bachche ke naam se
                    judi hai), par bachchon aur teachers ko naya number batana padega.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-sm text-gray-900">
                      <thead className="bg-indigo-50 text-indigo-800 sticky top-0">
                        <tr>
                          <th className="p-3 w-24">Roll No</th>
                          <th className="p-3">Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((s) => (
                          <tr key={s.id} className="border-t border-gray-100">
                            <td className="p-3">
                              {rollOf(s) || <span className="text-orange-600 font-medium">khali</span>}
                            </td>
                            <td className="p-3">{s.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
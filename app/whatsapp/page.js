'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

const SCHOOL = 'ABC Public School'

const waLink = (phone, text) => {
  let n = String(phone || '').replace(/\D/g, '')
  if (n.length === 11 && n.startsWith('0')) n = n.slice(1)
  if (n.length === 10) n = '91' + n
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null
}

function MessageCard({ title, text, phone }) {
  const link = waLink(phone, text)
  return (
    <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
      <h3 className="font-bold text-emerald-700 mb-3">{title}</h3>
      <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-green-50 border border-green-100 rounded-lg p-3 mb-4 font-sans">
        {text}
      </pre>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
        >
          📲 WhatsApp pe bhejo
        </a>
      ) : (
        <p className="text-sm text-red-600">
          Is student ka sahi parent contact number nahi hai. Students page se number theek karo.
        </p>
      )}
    </div>
  )
}

export default function WhatsAppPage() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [fees, setFees] = useState([])
  const [marks, setMarks] = useState([])
  const [attendance, setAttendance] = useState([])
  const [examName, setExamName] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('students').select('*').order('name')
      if (error) setError(error.message)
      else setStudents(data)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    const load = async () => {
      const { data: f } = await supabase
        .from('fees')
        .select('*')
        .eq('student-id', selected.id)
      setFees(f || [])

      const { data: m } = await supabase
        .from('marks')
        .select('*')
        .eq('student-id', selected.id)
      const list = m || []
      setMarks(list)
      setExamName(list.length > 0 ? list[0].exam_name : '')
    }
    load()
  }, [selected])

  useEffect(() => {
    if (!selected) return
    const load = async () => {
      const [y, mo] = month.split('-').map(Number)
      const lastDay = new Date(y, mo, 0).getDate()
      const { data } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('student-id', selected.id)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-${String(lastDay).padStart(2, '0')}`)
        .order('date')
      setAttendance(data || [])
    }
    load()
  }, [selected, month])

  const filtered = students.filter((s) => {
    const t = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(t) ||
      s.class?.toLowerCase().includes(t) ||
      s.roll_number?.toLowerCase().includes(t)
    )
  })

  // ---- Messages ----
  let feesMsg = ''
  let marksMsg = ''
  let attMsg = ''

  if (selected) {
    const total = fees.reduce((s, f) => s + Number(f.amount), 0)
    const paid = fees.reduce((s, f) => s + Number(f.paid_amount), 0)
    const pending = total - paid
    feesMsg =
      fees.length === 0
        ? `Namaste,\n${selected.name} (Class ${selected.class} ${selected.section || ''}) ka fee record abhi system me nahi hai.\n\n- ${SCHOOL}`
        : `Namaste,\n${selected.name} (Class ${selected.class} ${selected.section || ''}) ki fee ki jaankari:\n\nKul fee: ₹${total}\nJama: ₹${paid}\nBaaki: ₹${pending}\n\n${
            pending > 0 ? 'Kripya baaki fee jaldi jama karein.' : 'Dhanyavaad, poori fee jama ho chuki hai.'
          }\n\n- ${SCHOOL}`

    const examMarks = marks.filter((m) => m.exam_name === examName)
    const totObt = examMarks.reduce((s, m) => s + Number(m.marks_obtained), 0)
    const totMax = examMarks.reduce((s, m) => s + Number(m.max_marks), 0)
    const pct = totMax > 0 ? ((totObt / totMax) * 100).toFixed(1) : 0
    marksMsg =
      examMarks.length === 0
        ? `Namaste,\n${selected.name} ke marks abhi system me add nahi hue hain.\n\n- ${SCHOOL}`
        : `Namaste,\n${selected.name} (Class ${selected.class} ${selected.section || ''}) ke ${examName} ke marks:\n\n${examMarks
            .map((m) => `${m.subject}: ${m.marks_obtained}/${m.max_marks}`)
            .join('\n')}\n\nKul: ${totObt}/${totMax} (${pct}%)\n\n- ${SCHOOL}`

    const present = attendance.filter((a) => a.status === 'Present').length
    const absentDays = attendance.filter((a) => a.status === 'Absent')
    const totalDays = present + absentDays.length
    const attPct = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) : 0
    attMsg =
      totalDays === 0
        ? `Namaste,\n${selected.name} ka ${month} ka attendance record abhi system me nahi hai.\n\n- ${SCHOOL}`
        : `Namaste,\n${selected.name} (Class ${selected.class} ${selected.section || ''}) ka ${month} ka attendance:\n\nPresent: ${present} din\nAbsent: ${absentDays.length} din\nAttendance: ${attPct}%${
            absentDays.length > 0 ? `\n\nAbsent dates: ${absentDays.map((a) => a.date).join(', ')}` : ''
          }\n\n- ${SCHOOL}`
  }

  const examNames = [...new Set(marks.map((m) => m.exam_name))]

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-700 mb-2">💬 WhatsApp Updates</h1>
        <p className="text-gray-500 text-sm mb-6">
          Student chuno, message check karo, aur WhatsApp pe parent ko bhejo. WhatsApp khulega, bas Send dabana hai.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <input
              type="text"
              placeholder="🔍 Naam, class ya roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 p-2 rounded-lg mb-3"
            />
            <div className="max-h-96 overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left p-2 rounded-lg text-sm mb-1 ${
                    selected && selected.id === s.id
                      ? 'bg-emerald-100 text-emerald-800 font-semibold'
                      : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {s.name}
                  <span className="text-gray-400"> — Class {s.class} {s.section}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-gray-400 text-sm p-2">Koi student nahi mila</p>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            {!selected && (
              <p className="text-center text-gray-400 py-16">Left se ek student chuno</p>
            )}

            {selected && (
              <>
                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-800">{selected.name}</h2>
                  <p className="text-sm text-gray-500">
                    Class {selected.class} {selected.section} • Parent: {selected.parent_contact || 'number nahi hai'}
                  </p>
                </div>

                <MessageCard title="💰 Fees ki jaankari" text={feesMsg} phone={selected.parent_contact} />

                <div>
                  {examNames.length > 1 && (
                    <div className="mb-2 flex items-center gap-2">
                      <label className="text-sm text-gray-700 font-medium">Exam:</label>
                      <select
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="border border-gray-300 text-gray-900 bg-white p-1 rounded-lg text-sm"
                      >
                        {examNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <MessageCard title="📝 Test ke marks" text={marksMsg} phone={selected.parent_contact} />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <label className="text-sm text-gray-700 font-medium">Mahina:</label>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="border border-gray-300 text-gray-900 p-1 rounded-lg text-sm"
                    />
                  </div>
                  <MessageCard title="📅 Mahine ka attendance" text={attMsg} phone={selected.parent_contact} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
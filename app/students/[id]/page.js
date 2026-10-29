'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { MarksCharts, AttendanceCalendar } from '@/components/StudentCharts'

const ADMIN = ['Principal', 'Admin Staff']

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const receiptNo = (id) => 'RCPT-' + String(id).padStart(6, '0')
const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, dd] = String(d).slice(0, 10).split('-')
  return `${dd}/${m}/${y}`
}
const norm = (v) => String(v ?? '').trim().toLowerCase()

function Field({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900 break-words">{value}</div>
    </div>
  )
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState(null)
  const [student, setStudent] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [marks, setMarks] = useState([])
  const [attendance, setAttendance] = useState([])
  const [periods, setPeriods] = useState([])
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = ADMIN.includes(role)
  const isTeacher = role === 'Teacher'
  const isAccountant = role === 'Accountant'
  const canAcademics = isAdmin || isTeacher
  const canFees = isAdmin || isAccountant

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      setNotFound(false)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let r = null
        if (user) {
          const { data } = await supabase.from('staff').select('role').ilike('email', user.email).maybeSingle()
          r = data ? data.role : null
        }
        if (cancelled) return
        setRole(r)

        const { data: st, error: e1 } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
        if (e1) throw e1
        if (!st) {
          if (!cancelled) setNotFound(true)
          return
        }
        if (cancelled) return
        setStudent(st)

        const academics = ADMIN.includes(r) || r === 'Teacher'
        const feeAccess = ADMIN.includes(r) || r === 'Accountant'

        if (academics) {
          const { data: m, error: e2 } = await supabase.from('marks').select('*').eq('student-id', id)
          if (e2) throw e2
          const { data: a, error: e3 } = await supabase
            .from('attendance')
            .select('date, status')
            .eq('student-id', id)
            .order('date', { ascending: false })
            .limit(500)
          if (e3) throw e3
          const { data: t } = await supabase.from('timetable').select('day, period, section').eq('class', st.class)

          const map = {}
          ;(t || [])
            .filter((x) => norm(x.section) === '' || norm(x.section) === norm(st.section))
            .forEach((x) => {
              const d = norm(x.day)
              if (!map[d]) map[d] = new Set()
              map[d].add(x.period)
            })
          if (!cancelled) {
            setMarks(m || [])
            setAttendance(a || [])
            setPeriods(Object.keys(map).map((d) => ({ day: d, periods: map[d].size })))
          }
        }

        if (feeAccess) {
          const { data: f, error: e4 } = await supabase
            .from('fees')
            .select('*')
            .eq('student-id', id)
            .order('id')
          if (e4) throw e4
          let pays = []
          if (f && f.length > 0) {
            const { data: p, error: e5 } = await supabase
              .from('fee_payments')
              .select('*')
              .in('fee_id', f.map((x) => x.id))
              .order('id', { ascending: false })
            if (e5) throw e5
            pays = p || []
          }
          if (!cancelled) {
            setFees(f || [])
            setPayments(pays)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Data load nahi hua')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // ---- chhote summary numbers ----
  const presentDays = attendance.filter((a) => a.status === 'Present').length
  const absentDays = attendance.filter((a) => a.status === 'Absent').length
  const attPct = presentDays + absentDays > 0 ? Math.round((presentDays / (presentDays + absentDays)) * 100) : null

  let latestExam = null
  if (marks.length > 0) {
    const last = [...marks].sort((a, b) => b.id - a.id)[0]
    const key = norm(last.exam_name)
    const rows = marks.filter((m) => norm(m.exam_name) === key)
    const obt = rows.reduce((s, m) => s + Number(m.marks_obtained), 0)
    const max = rows.reduce((s, m) => s + Number(m.max_marks), 0)
    latestExam = { name: String(last.exam_name).trim(), pct: max > 0 ? Math.round((obt / max) * 100) : null }
  }

  const feeTotal = fees.reduce((s, f) => s + Number(f.amount), 0)
  const feePaid = fees.reduce((s, f) => s + Number(f.paid_amount || 0), 0)
  const feePending = Math.max(feeTotal - feePaid, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-xl font-bold text-gray-800">Student nahi mila</h1>
          <p className="text-gray-500 text-sm mt-2">
            Ya to ye student hai nahi, ya ye aapki class ka nahi hai.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-5 bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700"
          >
            Wapas jao
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg text-sm">
          {error || 'Student load nahi hua'}
        </p>
      </div>
    )
  }

  const card = 'bg-white p-5 sm:p-6 rounded-xl shadow-md border border-gray-200'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="text-indigo-600 hover:underline text-sm font-medium">
          ← Wapas
        </button>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg text-sm">{error}</p>
        )}

        {/* Header */}
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                Class {student.class} {student.section || ''}
                {student.roll_number ? ` • Roll No: ${student.roll_number}` : ''}
              </p>
            </div>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
              {role || 'Staff'} view
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {canAcademics && (
              <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{attPct === null ? '—' : attPct + '%'}</div>
                <div className="text-xs font-medium">Attendance</div>
              </div>
            )}
            {canAcademics && (
              <div className="bg-indigo-50 text-indigo-700 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{latestExam && latestExam.pct !== null ? latestExam.pct + '%' : '—'}</div>
                <div className="text-xs font-medium">{latestExam ? `Latest: ${latestExam.name}` : 'Latest result'}</div>
              </div>
            )}
            {canFees && (
              <div className="bg-yellow-50 text-yellow-700 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{money(feePending)}</div>
                <div className="text-xs font-medium">Fees baaki</div>
              </div>
            )}
          </div>
        </div>

        {/* Basic details */}
        <div className={card}>
          <h2 className="font-bold text-indigo-700 mb-4">👤 Jaankari</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Gender" value={student.gender} />
            <Field label="Admission No." value={student.admission_no} />
            {(isAdmin || isAccountant) && <Field label="Registration No." value={student.registration_no} />}
            <Field label="Father" value={student.father_name} />
            <Field label="Mother" value={student.mother_name} />
            <Field label="Parent contact" value={student.parent_contact} />
            {(isAdmin || isAccountant) && <Field label="Category" value={student.category} />}
            {isAdmin && <Field label="APAAR ID" value={student.apaar_id} />}
            {isAdmin && <Field label="Parent PAN" value={student.parent_pan} />}
          </div>
        </div>

        {/* Marks graph */}
        {canAcademics && (
          <div className={card}>
            <h2 className="font-bold text-indigo-700 mb-4">📈 Marks Graph</h2>
            <MarksCharts key={student.id} marks={marks} />
          </div>
        )}

        {/* Attendance */}
        {canAcademics && (
          <div className={card}>
            <h2 className="font-bold text-indigo-700 mb-4">📅 Attendance</h2>
            <AttendanceCalendar key={student.id} attendance={attendance} periods={periods} />
          </div>
        )}

        {/* Fees */}
        {canFees && (
          <div className={card}>
            <h2 className="font-bold text-indigo-700 mb-4">💰 Fees</h2>

            {fees.length === 0 ? (
              <p className="text-gray-400 text-sm">Is student ki fee abhi generate nahi hui.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-indigo-50 text-indigo-700 rounded-lg p-2">
                    <div className="font-bold">{money(feeTotal)}</div>
                    <div className="text-xs">Kul fee</div>
                  </div>
                  <div className="bg-green-50 text-green-700 rounded-lg p-2">
                    <div className="font-bold">{money(feePaid)}</div>
                    <div className="text-xs">Jama</div>
                  </div>
                  <div className="bg-red-50 text-red-700 rounded-lg p-2">
                    <div className="font-bold">{money(feePending)}</div>
                    <div className="text-xs">Baaki</div>
                  </div>
                </div>

                {fees.map((f) => (
                  <div key={f.id} className="flex flex-wrap justify-between gap-2 text-sm py-2 border-t border-gray-100">
                    <span>Due {fmtDate(f.due_date)}</span>
                    <span>
                      {money(f.paid_amount)} / {money(f.amount)}{' '}
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          f.status === 'Paid'
                            ? 'bg-green-100 text-green-700'
                            : f.status === 'Partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {f.status}
                      </span>
                    </span>
                  </div>
                ))}

                {payments.length > 0 && (
                  <div className="mt-5">
                    <h3 className="font-semibold text-gray-800 mb-2">Payment history</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-900">
                        <thead className="bg-indigo-50 text-indigo-800">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Receipt</th>
                            <th className="p-2">Amount</th>
                            <th className="p-2">Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr
                              key={p.id}
                              className={`border-t border-gray-100 ${p.reversed_at ? 'bg-red-50 text-gray-500 line-through' : ''}`}
                            >
                              <td className="p-2 whitespace-nowrap">{fmtDate(p.paid_on)}</td>
                              <td className="p-2 whitespace-nowrap">{receiptNo(p.id)}</td>
                              <td className="p-2 font-semibold whitespace-nowrap">{money(p.amount)}</td>
                              <td className="p-2">{p.mode || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {role && !canAcademics && !canFees && (
          <p className="text-center text-gray-400 text-sm">Aapke role ke liye sirf basic jaankari dikhti hai.</p>
        )}
      </div>
    </div>
  )
}
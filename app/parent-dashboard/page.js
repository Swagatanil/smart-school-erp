'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const COLORS = ['#4f46e5', '#059669', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#dc2626', '#65a30d']
const H = 240
const PAD = { l: 44, r: 30, t: 28, b: 54 }

const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
const clamp = (p) => Math.min(Math.max(p, 0), 100)
const short = (s, n = 11) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function buildMarksData(marks) {
  const sorted = [...marks].sort((a, b) => a.id - b.id)
  const exams = []
  const subjects = []
  const cells = {}

  sorted.forEach((m) => {
    const eName = String(m.exam_name || '').trim()
    const sName = String(m.subject || '').trim()
    const ek = eName.toLowerCase()
    const sk = sName.toLowerCase()

    if (!cells[ek]) {
      exams.push({ key: ek, name: eName })
      cells[ek] = { total: { obt: 0, max: 0 }, subjects: {} }
    }
    if (!subjects.find((s) => s.key === sk)) subjects.push({ key: sk, name: sName })

    const obt = Number(m.marks_obtained)
    const max = Number(m.max_marks)
    cells[ek].total.obt += obt
    cells[ek].total.max += max
    if (!cells[ek].subjects[sk]) cells[ek].subjects[sk] = { obt: 0, max: 0 }
    cells[ek].subjects[sk].obt += obt
    cells[ek].subjects[sk].max += max
  })

  return { exams, subjects, cells }
}

function LineChart({ exams, series, activeIndex, onSelect, showLabels, subLabels }) {
  const n = exams.length
  const innerW = Math.max((n - 1) * 90, 240)
  const step = n > 1 ? innerW / (n - 1) : 0
  const width = PAD.l + innerW + PAD.r
  const innerH = H - PAD.t - PAD.b
  const colW = n > 1 ? step : innerW
  const x = (i) => PAD.l + (n === 1 ? innerW / 2 : i * step)
  const y = (p) => PAD.t + (1 - clamp(p) / 100) * innerH

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} className="max-w-none">
        {/* chuna hua test highlight */}
        <rect
          x={x(activeIndex) - colW / 2}
          y={PAD.t - 10}
          width={colW}
          height={innerH + 10}
          fill="#eef2ff"
          rx="6"
        />

        {/* grid */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={PAD.l + innerW} y1={y(v)} y2={y(v)} stroke="#e5e7eb" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              {v}%
            </text>
          </g>
        ))}

        {/* lines */}
        {series.map((s) => {
          let d = ''
          let prev = false
          s.points.forEach((p, i) => {
            if (p === null) {
              prev = false
              return
            }
            d += `${prev ? 'L' : 'M'}${x(i)},${y(p)} `
            prev = true
          })
          return (
            <g key={s.key}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) =>
                p === null ? null : (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(p)}
                    r={i === activeIndex ? 6 : 4}
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                )
              )}
              {showLabels &&
                s.points.map((p, i) =>
                  p === null ? null : (
                    <text
                      key={'l' + i}
                      x={x(i)}
                      y={y(p) - 11}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#374151"
                    >
                      {p}%
                    </text>
                  )
                )}
            </g>
          )
        })}

        {/* x labels + click area */}
        {exams.map((e, i) => (
          <g key={e.key} onClick={() => onSelect(e.key)} style={{ cursor: 'pointer' }}>
            <rect
              x={x(i) - colW / 2}
              y={PAD.t - 10}
              width={colW}
              height={H - PAD.t + 10}
              fill="transparent"
            />
            <text
              x={x(i)}
              y={H - PAD.b + 20}
              textAnchor="middle"
              fontSize="12"
              fontWeight={i === activeIndex ? '700' : '500'}
              fill={i === activeIndex ? '#111827' : '#4b5563'}
            >
              {short(e.name)}
            </text>
            {subLabels && (
              <text x={x(i)} y={H - PAD.b + 36} textAnchor="middle" fontSize="11" fill="#6b7280">
                {subLabels[i]}
              </text>
            )}
            <title>{e.name}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

function MarksCharts({ marks }) {
  const [selected, setSelected] = useState(null)

  if (!marks || marks.length === 0) {
    return <p className="text-gray-400 text-sm">Koi marks record nahi hai</p>
  }

  const { exams, subjects, cells } = buildMarksData(marks)
  const activeKey = selected && cells[selected] ? selected : exams[exams.length - 1].key
  const activeIndex = exams.findIndex((e) => e.key === activeKey)
  const activeExam = exams[activeIndex]

  const overallSeries = [
    {
      key: 'overall',
      color: '#4f46e5',
      points: exams.map((e) => pctOf(cells[e.key].total.obt, cells[e.key].total.max)),
    },
  ]

  const subjectSeries = subjects.map((s, i) => ({
    key: s.key,
    name: s.name,
    color: COLORS[i % COLORS.length],
    points: exams.map((e) => {
      const c = cells[e.key].subjects[s.key]
      return c ? pctOf(c.obt, c.max) : null
    }),
  }))

  const activeSubjects = subjectSeries
    .map((s) => ({ ...s, cell: cells[activeKey].subjects[s.key] }))
    .filter((s) => s.cell)

  const subLabels = exams.map((e) => `${cells[e.key].total.obt}/${cells[e.key].total.max}`)

  return (
    <div className="space-y-8">
      {/* Graph 1: overall */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-1">Overall result</h4>
        <p className="text-xs text-gray-500 mb-3">
          Kisi bhi test ke point ya naam par click karo, neeche us test ke subject-wise marks dikhenge.
        </p>
        <LineChart
          exams={exams}
          series={overallSeries}
          activeIndex={activeIndex}
          onSelect={setSelected}
          showLabels
          subLabels={subLabels}
        />
        {exams.length === 1 && (
          <p className="text-xs text-gray-400 mt-2">Line dikhne ke liye kam se kam 2 test ke marks chahiye.</p>
        )}
      </div>

      {/* Graph 2: subject-wise trend */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-2">Subject-wise (har subject ka progress)</h4>
        <div className="flex flex-wrap gap-3 mb-3">
          {subjectSeries.map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-xs text-gray-700">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
        <LineChart
          exams={exams}
          series={subjectSeries}
          activeIndex={activeIndex}
          onSelect={setSelected}
          showLabels={false}
        />
      </div>

      {/* Chuna hua test ke subject-wise marks */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">{activeExam.name} — subject-wise marks</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeSubjects.map((s) => (
            <div
              key={s.key}
              className="bg-gray-50 rounded-lg p-3 border-l-4"
              style={{ borderLeftColor: s.color }}
            >
              <div className="text-sm font-medium text-gray-800">{s.name}</div>
              <div className="text-lg font-bold text-gray-900">
                {s.cell.obt}/{s.cell.max}
              </div>
              <div className="text-xs text-gray-500">{pctOf(s.cell.obt, s.cell.max)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ParentDashboard() {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const clearAndExit = () => {
    localStorage.removeItem('parentMobile')
    router.push('/parent-login')
  }

  useEffect(() => {
    const mobile = localStorage.getItem('parentMobile')
    if (!mobile) {
      router.push('/parent-login')
      return
    }

    const load = async () => {
      const { data, error } = await supabase.rpc('parent_portal', {
        p_mobile: mobile,
      })

      if (error || !data || data.length === 0) {
        clearAndExit()
        return
      }
      setChildren(data)
      setSelectedChild(data[0])
    }

    load()
  }, [])

  if (!selectedChild) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-emerald-700">👨‍👩‍👧 Parent Dashboard</h1>
          <button onClick={clearAndExit} className="text-red-600 hover:underline text-sm font-medium">
            Logout
          </button>
        </div>

        {children.length > 1 && (
          <div className="mb-6 bg-white p-4 rounded-xl shadow-md border border-gray-200">
            <label className="font-medium text-gray-700 mr-3">Select Child:</label>
            <select
              value={selectedChild.id}
              onChange={(e) =>
                setSelectedChild(children.find((c) => c.id.toString() === e.target.value))
              }
              className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Class {c.class} {c.section})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-800">{selectedChild.name}</h2>
          <p className="text-gray-500 text-sm">
            Class {selectedChild.class} {selectedChild.section} • Roll No: {selectedChild.roll_number}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
          <h3 className="font-bold text-emerald-700 mb-4">📈 Marks Graph</h3>
          <MarksCharts key={selectedChild.id} marks={selectedChild.marks} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-emerald-700 mb-3">📅 Recent Attendance</h3>
            {selectedChild.attendance.length === 0 && <p className="text-gray-400 text-sm">Koi record nahi hai</p>}
            {selectedChild.attendance.map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1 border-t border-gray-100 first:border-t-0">
                <span>{a.date}</span>
                <span className={a.status === 'Present' ? 'text-green-600' : 'text-red-600'}>{a.status}</span>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-emerald-700 mb-3">💰 Fees</h3>
            {selectedChild.fees.length === 0 && <p className="text-gray-400 text-sm">Koi record nahi hai</p>}
            {selectedChild.fees.map((f) => (
              <div key={f.id} className="text-sm py-1 border-t border-gray-100 first:border-t-0">
                <div className="flex justify-between">
                  <span>Due: {f.due_date}</span>
                  <span>₹{f.paid_amount} / ₹{f.amount}</span>
                </div>
                <span className={`text-xs ${f.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                  {f.status}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 md:col-span-2">
            <h3 className="font-bold text-emerald-700 mb-3">📝 Marks (detail)</h3>
            {selectedChild.marks.length === 0 && <p className="text-gray-400 text-sm">Koi record nahi hai</p>}
            {selectedChild.marks.map((m) => (
              <div key={m.id} className="flex justify-between text-sm py-1 border-t border-gray-100 first:border-t-0">
                <span>{m.exam_name} — {m.subject}</span>
                <span>{m.marks_obtained} / {m.max_marks}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
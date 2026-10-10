'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
const norm = (v) => String(v ?? '').trim().toLowerCase()
const r1 = (n) => Math.round(n * 10) / 10
const clamp = (p) => Math.min(Math.max(p, 0), 100)
const short = (s, n = 12) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
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

function analyze(marks, subjectKey, passMark, strict) {
  const sorted = [...marks].sort((a, b) => a.id - b.id)
  const exams = []
  const examMap = {}

  sorted.forEach((m) => {
    const ek = norm(m.exam_name)
    if (!ek) return
    if (!examMap[ek]) {
      examMap[ek] = { key: ek, name: String(m.exam_name).trim(), per: {} }
      exams.push(examMap[ek])
    }
    const sk = norm(m.subject)
    if (subjectKey !== 'all' && sk !== subjectKey) return
    const sid = m['student-id']
    const per = examMap[ek].per
    if (!per[sid]) per[sid] = { obt: 0, max: 0, subs: {} }
    const obt = Number(m.marks_obtained)
    const max = Number(m.max_marks)
    per[sid].obt += obt
    per[sid].max += max
    if (!per[sid].subs[sk]) per[sid].subs[sk] = { obt: 0, max: 0 }
    per[sid].subs[sk].obt += obt
    per[sid].subs[sk].max += max
  })

  const useStrict = strict && subjectKey === 'all'
  const result = []

  exams.forEach((ex) => {
    const rows = Object.keys(ex.per).map((sid) => {
      const p = ex.per[sid]
      const pct = p.max > 0 ? (p.obt / p.max) * 100 : 0
      const pass = useStrict
        ? Object.values(p.subs).every((s) => s.max > 0 && (s.obt / s.max) * 100 >= passMark)
        : pct >= passMark
      return { id: Number(sid), obt: p.obt, max: p.max, pct, pass }
    })
    if (rows.length === 0) return

    const count = rows.length
    const top = rows.reduce((a, b) => (b.pct > a.pct ? b : a), rows[0])
    const avgPct = rows.reduce((s, r) => s + r.pct, 0) / count
    const avgObt = rows.reduce((s, r) => s + r.obt, 0) / count
    const avgMax = rows.reduce((s, r) => s + r.max, 0) / count
    const passCount = rows.filter((r) => r.pass).length
    const passPct = Math.round((passCount / count) * 100)

    result.push({
      key: ex.key,
      name: ex.name,
      rows,
      count,
      top,
      avgPct,
      avgObt,
      avgMax,
      passCount,
      failCount: count - passCount,
      passPct,
      failPct: 100 - passPct,
    })
  })
  return result
}

// ---------- Bar chart (2 mode) ----------
const H = 260
const PAD = { l: 44, r: 20, t: 28, b: 56 }

function BarChart({ stats, activeIndex, onSelect, mode }) {
  const n = stats.length
  const gw = Math.max(110, 300 / n)
  const innerW = gw * n
  const width = PAD.l + innerW + PAD.r
  const innerH = H - PAD.t - PAD.b
  const cx = (i) => PAD.l + gw * (i + 0.5)
  const y = (p) => PAD.t + (1 - clamp(p) / 100) * innerH
  const base = y(0)
  const BW = 30

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} className="max-w-none">
        {stats.map((s, i) =>
          i === activeIndex ? (
            <rect
              key={'bg' + i}
              x={PAD.l + gw * i}
              y={PAD.t - 12}
              width={gw}
              height={innerH + 12}
              fill="#eef2ff"
              rx="6"
            />
          ) : null
        )}

        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={PAD.l + innerW} y1={y(v)} y2={y(v)} stroke="#e5e7eb" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              {v}%
            </text>
          </g>
        ))}

        {stats.map((s, i) => {
          if (mode === 'hi-avg') {
            const bars = [
              { v: s.top.pct, color: '#4f46e5', dx: -BW - 2 },
              { v: s.avgPct, color: '#10b981', dx: 2 },
            ]
            return (
              <g key={s.key}>
                {bars.map((b, j) => (
                  <g key={j}>
                    <rect
                      x={cx(i) + b.dx}
                      y={y(b.v)}
                      width={BW}
                      height={Math.max(base - y(b.v), 2)}
                      fill={b.color}
                      rx="3"
                    />
                    <text
                      x={cx(i) + b.dx + BW / 2}
                      y={y(b.v) - 5}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#374151"
                    >
                      {Math.round(b.v)}%
                    </text>
                  </g>
                ))}
              </g>
            )
          }

          const passH = (innerH * s.passPct) / 100
          const failH = (innerH * s.failPct) / 100
          return (
            <g key={s.key}>
              {passH > 0 && (
                <rect x={cx(i) - 22} y={base - passH} width={44} height={passH} fill="#16a34a" rx="3" />
              )}
              {failH > 0 && (
                <rect
                  x={cx(i) - 22}
                  y={base - passH - failH}
                  width={44}
                  height={failH}
                  fill="#dc2626"
                  rx="3"
                />
              )}
              {passH >= 16 && (
                <text
                  x={cx(i)}
                  y={base - passH / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {s.passPct}%
                </text>
              )}
              {failH >= 16 && (
                <text
                  x={cx(i)}
                  y={base - passH - failH / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {s.failPct}%
                </text>
              )}
            </g>
          )
        })}

        {stats.map((s, i) => (
          <g key={'x' + s.key} onClick={() => onSelect(s.key)} style={{ cursor: 'pointer' }}>
            <rect
              x={PAD.l + gw * i}
              y={PAD.t - 12}
              width={gw}
              height={H - PAD.t + 12}
              fill="transparent"
            />
            <text
              x={cx(i)}
              y={H - PAD.b + 20}
              textAnchor="middle"
              fontSize="12"
              fontWeight={i === activeIndex ? '700' : '500'}
              fill={i === activeIndex ? '#111827' : '#4b5563'}
            >
              {short(s.name)}
            </text>
            <text x={cx(i)} y={H - PAD.b + 36} textAnchor="middle" fontSize="11" fill="#6b7280">
              {s.count} bachche
            </text>
            <title>{s.name}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ---------- Page ----------
export default function ClassResultsPage() {
  const [classes, setClasses] = useState([])
  const [classesLoaded, setClassesLoaded] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')
  const [section, setSection] = useState('')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState([])
  const [loading, setLoading] = useState(false)
  const [passMark, setPassMark] = useState('33')
  const [strict, setStrict] = useState(false)
  const [subjectKey, setSubjectKey] = useState('all')
  const [selectedExam, setSelectedExam] = useState(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const rows = await fetchAll(() => supabase.from('students').select('id, class'))
        setClasses([...new Set(rows.map((r) => r.class).filter(Boolean))].sort(natural))
      } catch (e) {
        setError(e.message || 'Classes load nahi hui')
      }
      setClassesLoaded(true)
    }
    init()
  }, [])

  useEffect(() => {
    setStudents([])
    setMarks([])
    setSection('')
    setSubjectKey('all')
    setSelectedExam(null)
    if (!selectedClass) return
    const load = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, section, roll_number')
        .eq('class', selectedClass)
        .order('name')
      if (error) setError(error.message)
      else setStudents(data)
    }
    load()
  }, [selectedClass])

  useEffect(() => {
    setMarks([])
    setSelectedExam(null)
    setSubjectKey('all')
    const list = pickStudents(students, section)
    if (list.length === 0) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const ids = list.map((s) => s.id)
        let all = []
        for (let i = 0; i < ids.length; i += 50) {
          const chunk = ids.slice(i, i + 50)
          const rows = await fetchAll(() => supabase.from('marks').select('*').in('student-id', chunk))
          all = all.concat(rows)
        }
        if (!cancelled) setMarks(all)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Marks load nahi hue')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [students, section])

  const sections = getSections(students)
  const classStudents = pickStudents(students, section)
  const needSection = sections.length > 1 && !section
  const byId = {}
  classStudents.forEach((s) => {
    byId[s.id] = s
  })

  const subjects = []
  marks.forEach((m) => {
    const k = norm(m.subject)
    if (k && !subjects.find((s) => s.key === k)) subjects.push({ key: k, name: String(m.subject).trim() })
  })
  subjects.sort((a, b) => natural(a.name, b.name))

  const pm = passMark.trim() === '' ? NaN : Number(passMark)
  const passNum = Number.isFinite(pm) && pm >= 0 && pm <= 100 ? pm : 33
  const stats = analyze(marks, subjectKey, passNum, strict)

  const activeKey = selectedExam && stats.find((s) => s.key === selectedExam) ? selectedExam : stats.length ? stats[stats.length - 1].key : null
  const activeIndex = stats.findIndex((s) => s.key === activeKey)
  const active = activeIndex >= 0 ? stats[activeIndex] : null

  let ranked = []
  if (active) {
    let lastKey = null
    let lastRank = 0
    ranked = [...active.rows]
      .sort((a, b) => b.pct - a.pct)
      .map((r, i) => {
        const k = Math.round(r.pct * 100)
        const rank = k === lastKey ? lastRank : i + 1
        lastKey = k
        lastRank = rank
        return { ...r, rank }
      })
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">📊 Class Results</h1>
        <p className="text-gray-500 text-sm mb-6">
          Class ke har test ka Highest, Average aur Pass/Fail dekho. Kisi test par click karo to uski rank list dikhegi.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        {classesLoaded && classes.length === 0 && (
          <p className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-4 rounded-lg text-sm">
            Aapke liye koi class nahi mili. Agar aap Teacher ho to Admin se apni class assign karwao.
          </p>
        )}

        {classes.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <select value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)} className={inputCls}>
                <option value="all">Sab subjects (total)</option>
                {subjects.map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pass marks %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={passMark}
                onChange={(e) => setPassMark(e.target.value)}
                className={`w-24 ${inputCls}`}
              />
            </div>

            <label
              className={`flex items-center gap-2 text-sm ${
                subjectKey === 'all' ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={strict}
                disabled={subjectKey !== 'all'}
                onChange={(e) => setStrict(e.target.checked)}
                className="w-4 h-4"
              />
              Har subject me pass zaroori
            </label>
          </div>
        )}

        {selectedClass && needSection && <p className="text-center text-gray-400 py-12">Ab section chuno</p>}
        {selectedClass && !needSection && loading && <p className="text-center text-gray-400 py-12">Loading...</p>}

        {selectedClass && !needSection && !loading && classStudents.length > 0 && stats.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            Is class ke abhi koi marks nahi hain
            {subjectKey !== 'all' ? ' (is subject ke)' : ''}.
          </p>
        )}

        {active && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 text-indigo-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{r1(active.top.pct)}%</div>
                <div className="text-sm font-medium">Highest</div>
                <div className="text-xs mt-1">
                  {byId[active.top.id]?.name || ''} ({active.top.obt}/{active.top.max})
                </div>
              </div>
              <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{r1(active.avgPct)}%</div>
                <div className="text-sm font-medium">Average</div>
                <div className="text-xs mt-1">
                  {r1(active.avgObt)}/{r1(active.avgMax)}
                </div>
              </div>
              <div className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{active.passPct}%</div>
                <div className="text-sm font-medium">Pass</div>
                <div className="text-xs mt-1">{active.passCount} bachche</div>
              </div>
              <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{active.failPct}%</div>
                <div className="text-sm font-medium">Fail</div>
                <div className="text-xs mt-1">{active.failCount} bachche</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-6 -mt-3">
              Ye numbers <strong>{active.name}</strong> ke hain. Jin bachchon ke marks bhare nahi gaye (absent), wo
              ginti me nahi aate.
            </p>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-800 mb-1">Highest aur Average (har test)</h3>
              <div className="flex gap-4 text-xs text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#4f46e5' }} /> Highest
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} /> Average
                </span>
                <span className="text-gray-400">(sab % me)</span>
              </div>
              <BarChart stats={stats} activeIndex={activeIndex} onSelect={setSelectedExam} mode="hi-avg" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-800 mb-1">Pass aur Fail % (har test)</h3>
              <div className="flex gap-4 text-xs text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#16a34a' }} /> Pass
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#dc2626' }} /> Fail
                </span>
                <span className="text-gray-400">(pass marks: {passNum}%)</span>
              </div>
              <BarChart stats={stats} activeIndex={activeIndex} onSelect={setSelectedExam} mode="pass-fail" />
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto mb-6">
              <table className="w-full text-left text-sm text-gray-900">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="p-3">Test</th>
                    <th className="p-3">Bachche</th>
                    <th className="p-3">Highest</th>
                    <th className="p-3">Average</th>
                    <th className="p-3">Pass %</th>
                    <th className="p-3">Fail %</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr
                      key={s.key}
                      onClick={() => setSelectedExam(s.key)}
                      className={`border-t border-gray-100 cursor-pointer hover:bg-indigo-50 ${
                        s.key === activeKey ? 'bg-indigo-50 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3">{s.name}</td>
                      <td className="p-3">{s.count}</td>
                      <td className="p-3">
                        {r1(s.top.pct)}% <span className="text-gray-500 font-normal">({s.top.obt}/{s.top.max})</span>
                      </td>
                      <td className="p-3">
                        {r1(s.avgPct)}% <span className="text-gray-500 font-normal">({r1(s.avgObt)}/{r1(s.avgMax)})</span>
                      </td>
                      <td className="p-3 text-green-700">{s.passPct}%</td>
                      <td className="p-3 text-red-700">{s.failPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <h3 className="font-bold text-gray-800 p-4 border-b border-gray-200">
                {active.name} — rank list
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm text-gray-900">
                  <thead className="bg-indigo-50 text-indigo-800 sticky top-0">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Roll</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Marks</th>
                      <th className="p-3">%</th>
                      <th className="p-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r) => {
                      const st = byId[r.id]
                      return (
                        <tr key={r.id} className={`border-t border-gray-100 ${r.pass ? '' : 'bg-red-50'}`}>
                          <td className="p-3">{r.rank}</td>
                          <td className="p-3">{st ? rollOf(st) || '—' : '—'}</td>
                          <td className="p-3">{st ? st.name : '—'}</td>
                          <td className="p-3">{r.obt}/{r.max}</td>
                          <td className="p-3">{r1(r.pct)}%</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {r.pass ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
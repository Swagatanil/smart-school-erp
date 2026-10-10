'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)
const show = (p) => (p === null ? '—' : p + '%')
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r)
const ADMIN_ROLES = ['Principal', 'Admin Staff']

const titleOf = (role) => {
  if (ADMIN_ROLES.includes(role)) return 'Admin Dashboard'
  if (role === 'Teacher') return 'Teacher Dashboard'
  if (role === 'Accountant') return 'Accountant Dashboard'
  return 'Staff Dashboard'
}

const getPass = (v) => {
  const t = String(v).trim()
  if (t === '') return 33
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 33
}

function Card({ href, onClick, icon, label, value, sub, color, active, hint = 'Detail dekho →' }) {
  const body = (
    <>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {sub && <div className="text-xs opacity-75 mt-1 break-words">{sub}</div>}
      {(href || onClick) && <div className="text-xs mt-2 underline">{hint}</div>}
    </>
  )
  const cls = `rounded-xl shadow-md p-3 sm:p-4 text-center block w-full ${color} ${
    active ? 'ring-2 ring-offset-2 ring-indigo-400' : ''
  }`
  if (href) {
    return (
      <Link href={href} className={`${cls} hover:shadow-lg hover:-translate-y-0.5 transition`}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} hover:shadow-lg transition`}>
        {body}
      </button>
    )
  }
  return <div className={cls}>{body}</div>
}

export default function Dashboard() {
  const [notices, setNotices] = useState([])
  const [me, setMe] = useState(null)
  const [role, setRole] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [stats, setStats] = useState({
    totalStudents: 0, present: 0, absent: 0,
    totalStaff: 0, staffPresent: 0, staffAbsent: 0,
    feeTotal: 0, feePending: 0,
  })

  const [exams, setExams] = useState([])
  const [exam, setExam] = useState('')
  const [passMark, setPassMark] = useState('33')
  const [res, setRes] = useState(null)
  const [resLoading, setResLoading] = useState(false)
  const [resError, setResError] = useState('')
  const [examsLoaded, setExamsLoaded] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const supabase = createClient()

  const admin = ADMIN_ROLES.includes(role)
  const isTeacher = role === 'Teacher'
  const feeAccess = admin || role === 'Accountant'
  const showResults = admin || isTeacher

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let r = null
        if (user) {
          const { data } = await supabase
            .from('staff')
            .select('role, name')
            .ilike('email', user.email)
            .maybeSingle()
          r = data ? data.role : null
          if (data) setMe({ name: data.name, role: data.role })
        }
        setRole(r)
        const isAdmin = ADMIN_ROLES.includes(r)
        const hasFee = isAdmin || r === 'Accountant'
        const today = todayStr()

        const { data: noticesData } = await supabase
          .from('notices')
          .select('*')
          .order('id', { ascending: false })
          .limit(3)
        if (noticesData) setNotices(noticesData)

        const count = async (q) => {
          const { count } = await q
          return count || 0
        }
        const head = { count: 'exact', head: true }
        const next = {
          totalStudents: 0, present: 0, absent: 0,
          totalStaff: 0, staffPresent: 0, staffAbsent: 0,
          feeTotal: 0, feePending: 0,
        }

        next.totalStudents = await count(supabase.from('students').select('*', head))
        next.present = await count(
          supabase.from('attendance').select('*', head).eq('date', today).eq('status', 'Present')
        )
        next.absent = await count(
          supabase.from('attendance').select('*', head).eq('date', today).eq('status', 'Absent')
        )

        if (isAdmin) {
          next.totalStaff = await count(supabase.from('staff').select('*', head))
          next.staffPresent = await count(
            supabase.from('staff_attendance').select('*', head).eq('date', today).eq('status', 'Present')
          )
          next.staffAbsent = await count(
            supabase.from('staff_attendance').select('*', head).eq('date', today).eq('status', 'Absent')
          )
          const { data: pend } = await supabase.rpc('pending_signups')
          setPendingCount(pend ? pend.length : 0)
        }

        if (hasFee) {
          try {
            const rows = await fetchAll(() => supabase.from('fees').select('amount, paid_amount'))
            rows.forEach((f) => {
              next.feeTotal += Number(f.amount)
              next.feePending += Math.max(Number(f.amount) - Number(f.paid_amount), 0)
            })
          } catch (e) {
            console.error(e)
          }
        }

        setStats(next)
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  // Exam ki list
  useEffect(() => {
    if (!showResults) return
    const load = async () => {
      const { data, error } = await supabase.rpc('exam_names')
      if (error) {
        setResError(error.message)
      } else {
        const list = (data || []).map((e) => e.name)
        setExams(list)
        if (list.length > 0) setExam(list[0])
      }
      setExamsLoaded(true)
    }
    load()
  }, [showResults])

  // Result ka hisaab
  useEffect(() => {
    if (!showResults || !exam) return
    let cancelled = false
    const t = setTimeout(async () => {
      setResLoading(true)
      setResError('')
      const { data, error } = await supabase.rpc('school_results', {
        p_exam: exam,
        p_pass: getPass(passMark),
      })
      if (cancelled) return
      if (error) setResError(error.message)
      else setRes(data)
      setResLoading(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [showResults, exam, passMark])

  const marked = stats.present + stats.absent
  const staffMarked = stats.staffPresent + stats.staffAbsent
  const count = res ? res.count : 0
  const passPct = count > 0 ? Math.round((res.pass_count / count) * 100) : null
  const failPct = passPct === null ? null : 100 - passPct
  const top = res && res.top && res.top.length > 0 ? res.top[0] : null

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{titleOf(role)}</h1>
          {me && (
            <p className="text-gray-500 mt-1">
              Namaste, <strong className="text-gray-800">{me.name}</strong>
              <span className="ml-2 inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {me.role}
              </span>
            </p>
          )}
        </div>

        {admin && pendingCount > 0 && (
          <Link
            href="/approvals"
            className="block bg-orange-50 border border-orange-300 text-orange-800 rounded-xl p-4 mb-6 text-center font-semibold hover:bg-orange-100 transition"
          >
            🔔 {pendingCount} naye signup ki approval baaki hai. Dekho →
          </Link>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <Card
            href="/students"
            icon="🎓"
            label={isTeacher ? 'Mere Students' : 'Total Students'}
            value={stats.totalStudents}
            color="bg-indigo-50 text-indigo-700"
          />
          <Card
            href="/attendance-report?view=present"
            icon="✅"
            label="Students Present"
            value={show(pct(stats.present, marked))}
            sub={marked > 0 ? `${stats.present} / ${marked} aaj` : 'Aaj attendance mark nahi hui'}
            color="bg-green-50 text-green-700"
          />
          <Card
            href="/attendance-report?view=absent"
            icon="❌"
            label="Students Absent"
            value={stats.absent}
            sub="Class chuno aur list dekho"
            color="bg-red-50 text-red-700"
          />
          {admin && (
            <Card
              href="/staff-attendance"
              icon="👩‍🏫"
              label="Staff Present"
              value={show(pct(stats.staffPresent, staffMarked))}
              sub={staffMarked > 0 ? `${stats.staffPresent} / ${staffMarked} aaj` : 'Aaj attendance mark nahi hui'}
              color="bg-purple-50 text-purple-700"
            />
          )}
          {feeAccess && (
            <Card
              href="/fees-report"
              icon="💰"
              label="Fees Baaki"
              value={show(pct(stats.feePending, stats.feeTotal))}
              sub={`${money(stats.feePending)} baaki`}
              color="bg-yellow-50 text-yellow-700"
            />
          )}
        </div>

        {showResults && (
          <section className="mb-8">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-indigo-700">
                {isTeacher ? '🎯 Mere classes ka result' : '🎯 School ka result'}
              </h2>
              {exams.length > 0 && (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Exam</label>
                    <select
                      value={exam}
                      onChange={(e) => {
                        setExam(e.target.value)
                        setShowTop(false)
                      }}
                      className={inputCls}
                    >
                      {exams.map((n) => (
                        <option key={n} value={n}>{n}</option>
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
                      className={`w-20 ${inputCls}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {resError && (
              <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">
                {resError}
              </p>
            )}

            {examsLoaded && exams.length === 0 && !resError && (
              <p className="bg-white text-gray-500 border border-gray-200 rounded-xl p-6 text-center text-sm">
                Abhi koi result nahi hai. Marks Entry ya Marks Import se marks daalo
                {isTeacher ? ' (aur Admin se apni class assign karwao).' : '.'}
              </p>
            )}

            {resLoading && !res && <p className="text-center text-gray-400 py-6">Loading...</p>}

            {res && count === 0 && !resLoading && exam && (
              <p className="bg-white text-gray-500 border border-gray-200 rounded-xl p-6 text-center text-sm">
                Is exam ke marks nahi mile.
              </p>
            )}

            {res && count > 0 && (
              <>
                <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 ${resLoading ? 'opacity-60' : ''}`}>
                  <Card
                    icon="✅"
                    label="Pass"
                    value={passPct + '%'}
                    sub={`${res.pass_count} bachche`}
                    color="bg-green-50 text-green-700"
                  />
                  <Card
                    icon="❌"
                    label="Fail"
                    value={failPct + '%'}
                    sub={`${count - res.pass_count} bachche`}
                    color="bg-red-50 text-red-700"
                  />
                  <Card
                    icon="📈"
                    label="Average"
                    value={res.avg_pct + '%'}
                    sub={`${res.avg_obt}/${res.avg_mx} marks`}
                    color="bg-emerald-50 text-emerald-700"
                  />
                  {top && (
                    <Card
                      onClick={() => setShowTop(!showTop)}
                      active={showTop}
                      hint={showTop ? 'List band karo' : 'Top 10 dekho →'}
                      icon="🏆"
                      label="Topper"
                      value={top.pct + '%'}
                      sub={`${top.name} (Class ${top.class}${top.section ? ' ' + top.section : ''})`}
                      color="bg-yellow-50 text-yellow-700"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {exam}: {count} bachchon ke marks, pass marks {getPass(passMark)}%. Jinke marks bhare nahi gaye (absent),
                  wo ginti me nahi aate.
                </p>

                {showTop && res.top.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <h3 className="font-bold text-gray-800">🏆 Top 10 — {exam}</h3>
                      <button
                        type="button"
                        onClick={() => setShowTop(false)}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Band karo
                      </button>
                    </div>
                    {res.top.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 first:border-t-0"
                      >
                        <div className="w-8 text-center text-lg font-bold text-gray-700">{medal(t.rnk)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{t.name}</div>
                          <div className="text-xs text-gray-500">
                            Class {t.class} {t.section || ''}
                            {t.roll_number ? ` • Roll ${t.roll_number}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-700">{t.pct}%</div>
                          <div className="text-xs text-gray-500">
                            {t.obt}/{t.mx}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {res.by_class && res.by_class.length > 1 && (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-800 mb-3">Class-wise (average aur pass %)</h3>
                    {[...res.by_class]
                      .sort((a, b) => natural(`${a.class} ${a.section}`, `${b.class} ${b.section}`))
                      .map((c, i) => (
                        <div key={i} className="py-2 border-t border-gray-100 first:border-t-0">
                          <div className="flex flex-wrap justify-between gap-x-3 text-sm text-gray-800 mb-1">
                            <span className="font-medium">
                              Class {c.class}
                              {c.section ? ` - ${c.section}` : ''}{' '}
                              <span className="text-gray-400 font-normal">({c.count} bachche)</span>
                            </span>
                            <span>
                              Avg {c.avg_pct}% • Pass {c.pass_pct}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-indigo-500 rounded-full"
                              style={{ width: Math.min(Number(c.avg_pct), 100) + '%' }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-bold text-indigo-700 mb-4">📢 Latest Notices</h2>
          {notices.length === 0 && <p className="text-gray-400 text-sm">Koi notice nahi hai abhi</p>}
          {notices.map((n) => (
            <div key={n.id} className="border-t border-gray-100 py-3 first:border-t-0 first:pt-0">
              <h3 className="font-semibold text-gray-800">{n.title}</h3>
              <p className="text-gray-600 text-sm">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
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

function Card({ href, icon, label, value, sub, color }) {
  const body = (
    <>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {sub && <div className="text-xs opacity-75 mt-1">{sub}</div>}
      {href && <div className="text-xs mt-2 underline">Detail dekho →</div>}
    </>
  )
  const cls = `rounded-xl shadow-md p-4 text-center block ${color}`
  return href ? (
    <Link href={href} className={`${cls} hover:shadow-lg hover:-translate-y-0.5 transition`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export default function Dashboard() {
  const [notices, setNotices] = useState([])
  const [role, setRole] = useState(null)
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    absent: 0,
    totalStaff: 0,
    staffPresent: 0,
    staffAbsent: 0,
    feeTotal: 0,
    feePending: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let r = null
        if (user) {
          const { data } = await supabase
            .from('staff')
            .select('role')
            .ilike('email', user.email)
            .maybeSingle()
          r = data ? data.role : null
        }
        setRole(r)
        const admin = r === 'Principal' || r === 'Admin Staff'
        const feeAccess = admin || r === 'Accountant'
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

        if (admin) {
          next.totalStaff = await count(supabase.from('staff').select('*', head))
          next.staffPresent = await count(
            supabase.from('staff_attendance').select('*', head).eq('date', today).eq('status', 'Present')
          )
          next.staffAbsent = await count(
            supabase.from('staff_attendance').select('*', head).eq('date', today).eq('status', 'Absent')
          )
        }

        if (feeAccess) {
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

  const admin = role === 'Principal' || role === 'Admin Staff'
  const feeAccess = admin || role === 'Accountant'

  const marked = stats.present + stats.absent
  const staffMarked = stats.staffPresent + stats.staffAbsent

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome to School ERP Dashboard</h1>
          <p className="text-gray-500 mt-2">Kisi bhi card par click karke detail dekho</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card
            href="/students"
            icon="🎓"
            label="Total Students"
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

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
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
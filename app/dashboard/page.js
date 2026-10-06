'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function Dashboard() {
  const [notices, setNotices] = useState([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [todayPresent, setTodayPresent] = useState(0)
  const [todayAbsent, setTodayAbsent] = useState(0)
  const [pendingFees, setPendingFees] = useState(0)
  const [totalStaff, setTotalStaff] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .order('id', { ascending: false })
        .limit(3)
      if (noticesData) setNotices(noticesData)

      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
      setTotalStudents(studentCount || 0)

      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', today)

      if (attendanceData) {
        setTodayPresent(attendanceData.filter((a) => a.status === 'Present').length)
        setTodayAbsent(attendanceData.filter((a) => a.status === 'Absent').length)
      }

      const { data: feesData } = await supabase
        .from('fees')
        .select('amount, paid_amount')

      if (feesData) {
        const pending = feesData.reduce(
          (sum, f) => sum + (Number(f.amount) - Number(f.paid_amount)),
          0
        )
        setPendingFees(pending)
      }

      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
      setTotalStaff(staffCount || 0)
    }

    fetchData()
  }, [])

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: '🎓', color: 'bg-indigo-50 text-indigo-700' },
    { label: "Today's Present", value: todayPresent, icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: "Today's Absent", value: todayAbsent, icon: '❌', color: 'bg-red-50 text-red-700' },
    { label: 'Pending Fees', value: `₹${pendingFees}`, icon: '💰', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Total Staff', value: totalStaff, icon: '👩‍🏫', color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome to School ERP Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Login successful!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-xl shadow-md p-4 text-center ${s.color}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-indigo-700 mb-4">📢 Latest Notices</h2>
          {notices.length === 0 && (
            <p className="text-gray-400 text-sm">Koi notice nahi hai abhi</p>
          )}
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
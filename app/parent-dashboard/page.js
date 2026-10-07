'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ParentDashboard() {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [fees, setFees] = useState([])
  const [marks, setMarks] = useState([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const mobile = localStorage.getItem('parentMobile')
    if (!mobile) {
      router.push('/parent-login')
      return
    }

    const fetchChildren = async () => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('parent_contact', mobile)

      if (data && data.length > 0) {
        setChildren(data)
        setSelectedChild(data[0])
      } else {
        router.push('/parent-login')
      }
    }

    fetchChildren()
  }, [])

  useEffect(() => {
    if (!selectedChild) return

    const fetchChildData = async () => {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student-id', selectedChild.id)
        .order('date', { ascending: false })
        .limit(10)
      if (attendanceData) setAttendance(attendanceData)

      const { data: feesData } = await supabase
        .from('fees')
        .select('*')
        .eq('student-id', selectedChild.id)
      if (feesData) setFees(feesData)

      const { data: marksData } = await supabase
        .from('marks')
        .select('*')
        .eq('student-id', selectedChild.id)
      if (marksData) setMarks(marksData)
    }

    fetchChildData()
  }, [selectedChild])

  const handleLogout = () => {
    localStorage.removeItem('parentMobile')
    router.push('/parent-login')
  }

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
          <button
            onClick={handleLogout}
            className="text-red-600 hover:underline text-sm font-medium"
          >
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-emerald-700 mb-3">📅 Recent Attendance</h3>
            {attendance.length === 0 && <p className="text-gray-400 text-sm">Koi record nahi hai</p>}
            {attendance.map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1 border-t border-gray-100 first:border-t-0">
                <span>{a.date}</span>
                <span className={a.status === 'Present' ? 'text-green-600' : 'text-red-600'}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-emerald-700 mb-3">💰 Fees</h3>
            {fees.length === 0 && <p className="text-gray-400 text-sm">Koi record nahi hai</p>}
            {fees.map((f) => (
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
            <h3 className="font-bold text-emerald-700 mb-3">📝 Marks</h3>
            {marks.length === 0 && <p className="text-gray-400 text-sm">Koi record nahi hai</p>}
            {marks.map((m) => (
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
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function AttendancePage() {
  const [students, setStudents] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*').order('name')
    if (error) {
      setError(error.message)
    } else {
      setStudents(data)
    }
  }

  const fetchAttendanceForDate = async (selectedDate) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', selectedDate)

    if (!error && data) {
      const map = {}
      data.forEach((record) => {
        map[record['student-id']] = record.status
      })
      setAttendanceMap(map)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    fetchAttendanceForDate(date)
  }, [date])

  const markStatus = (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSaveAttendance = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    await supabase.from('attendance').delete().eq('date', date)

    const records = students
      .filter((s) => attendanceMap[s.id])
      .map((s) => ({
        'student-id': s.id,
        date: date,
        status: attendanceMap[s.id],
      }))

    if (records.length > 0) {
      const { error } = await supabase.from('attendance').insert(records)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Attendance save ho gayi!')
      }
    } else {
      setMessage('Koi attendance mark nahi ki gayi.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📅 Attendance</h1>

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex items-center gap-4">
          <label className="font-medium text-gray-700">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900"
          />
        </div>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {message}
          </p>
        )}

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Class</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-gray-200">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.class} {s.section}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => markStatus(s.id, 'Present')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                        attendanceMap[s.id] === 'Present'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => markStatus(s.id, 'Absent')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                        attendanceMap[s.id] === 'Absent'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      Absent
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-400">
                    Pehle Students page se students add karo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleSaveAttendance}
          disabled={loading}
          className="mt-6 w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
    </div>
  )
}
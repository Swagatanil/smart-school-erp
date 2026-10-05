'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function ReportCardPage() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentInfo, setStudentInfo] = useState(null)
  const [marks, setMarks] = useState([])
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name')
    if (data) setStudents(data)
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedStudent) return

    const student = students.find((s) => s.id.toString() === selectedStudent)
    setStudentInfo(student)

    const { data, error } = await supabase
      .from('marks')
      .select('*')
      .eq('student-id', selectedStudent)

    if (error) {
      setError(error.message)
    } else {
      setMarks(data)
    }
  }

  const totalObtained = marks.reduce((sum, m) => sum + Number(m.marks_obtained), 0)
  const totalMax = marks.reduce((sum, m) => sum + Number(m.max_marks), 0)
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0

  const getGrade = (pct) => {
    if (pct >= 90) return 'A+'
    if (pct >= 75) return 'A'
    if (pct >= 60) return 'B'
    if (pct >= 45) return 'C'
    if (pct >= 33) return 'D'
    return 'Fail'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📄 Report Card</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleGenerate}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 flex gap-4"
        >
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white flex-1"
            required
          >
            <option value="">Student select karo</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.class} {s.section})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Generate
          </button>
        </form>

        {studentInfo && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 print:shadow-none">
            <div className="text-center border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🏫 School Report Card</h2>
              <p className="text-gray-600 mt-2">
                <strong>{studentInfo.name}</strong> — Class {studentInfo.class} {studentInfo.section}
              </p>
              <p className="text-sm text-gray-500">Roll No: {studentInfo.roll_number}</p>
            </div>

            <table className="w-full text-left mb-4">
              <thead className="bg-indigo-50 text-indigo-800">
                <tr>
                  <th className="p-2">Exam</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Marks</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr key={m.id} className="border-t border-gray-200">
                    <td className="p-2">{m.exam_name}</td>
                    <td className="p-2">{m.subject}</td>
                    <td className="p-2">{m.marks_obtained} / {m.max_marks}</td>
                  </tr>
                ))}
                {marks.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-400">
                      Is student ke marks abhi add nahi hue
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {marks.length > 0 && (
              <div className="bg-indigo-50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total: {totalObtained} / {totalMax}</p>
                  <p className="text-sm text-gray-600">Percentage: {percentage}%</p>
                </div>
                <div className="text-2xl font-bold text-indigo-700">
                  Grade: {getGrade(percentage)}
                </div>
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="mt-6 w-full bg-gray-700 text-white p-2 rounded-lg font-semibold hover:bg-gray-800 transition print:hidden"
            >
              🖨️ Print Report Card
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
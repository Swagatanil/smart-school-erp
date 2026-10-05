'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function MarksPage() {
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [subject, setSubject] = useState('')
  const [examName, setExamName] = useState('')
  const [marksObtained, setMarksObtained] = useState('')
  const [maxMarks, setMaxMarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name')
    if (data) setStudents(data)
  }

  const fetchMarks = async () => {
    const { data, error } = await supabase
      .from('marks')
      .select('*, students!student-id(name, class)')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setMarks(data)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchMarks()
  }, [])

  const handleAddMarks = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('marks').insert([
      {
        'student-id': selectedStudent,
        subject,
        exam_name: examName,
        marks_obtained: parseFloat(marksObtained),
        max_marks: parseFloat(maxMarks),
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setSubject('')
      setExamName('')
      setMarksObtained('')
      setMaxMarks('')
      fetchMarks()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('marks').delete().eq('id', id)
    if (!error) fetchMarks()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📝 Marks / Exams</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleAddMarks}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
            required
          >
            <option value="">Student select karo</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.class} {s.section})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Exam Name (e.g. Half Yearly)"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />

          <input
            type="text"
            placeholder="Subject (e.g. Maths)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Marks Obtained"
              value={marksObtained}
              onChange={(e) => setMarksObtained(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400 w-1/2"
              required
            />
            <input
              type="number"
              placeholder="Max Marks"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400 w-1/2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Marks'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Exam</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Marks</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m) => (
                <tr key={m.id} className="border-t border-gray-200">
                  <td className="p-3">{m.students?.name || '—'}</td>
                  <td className="p-3">{m.exam_name}</td>
                  <td className="p-3">{m.subject}</td>
                  <td className="p-3">{m.marks_obtained} / {m.max_marks}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {marks.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-400">
                    Koi marks entry nahi hai abhi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
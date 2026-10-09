'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'RTE', 'Self-Finance']
const GENDERS = ['Male', 'Female', 'Other']

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [section, setSection] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [category, setCategory] = useState('')
  const [parentContact, setParentContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const supabase = createClient()

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setStudents(data)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const resetForm = () => {
    setName('')
    setGender('')
    setStudentClass('')
    setSection('')
    setRollNumber('')
    setCategory('')
    setParentContact('')
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name,
      gender: gender || null,
      class: studentClass,
      section,
      roll_number: rollNumber,
      category: category || null,
      parent_contact: parentContact,
    }

    const { error } = editingId
      ? await supabase.from('students').update(payload).eq('id', editingId)
      : await supabase.from('students').insert([payload])

    if (error) {
      setError(error.message)
    } else {
      resetForm()
      fetchStudents()
    }
    setLoading(false)
  }

  const handleEdit = (s) => {
    setEditingId(s.id)
    setName(s.name || '')
    setGender(s.gender || '')
    setStudentClass(s.class || '')
    setSection(s.section || '')
    setRollNumber(s.roll_number || '')
    setCategory(s.category || '')
    setParentContact(s.parent_contact || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (!error) fetchStudents()
  }

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase()
    return (
      s.name?.toLowerCase().includes(term) ||
      s.class?.toLowerCase().includes(term) ||
      s.roll_number?.toLowerCase().includes(term)
    )
  })

  const inputCls =
    'bg-white text-gray-900 placeholder-gray-400 border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">🎓 Students</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white text-gray-900 p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {editingId && (
            <div className="md:col-span-2 bg-yellow-50 text-yellow-800 p-2 rounded-lg text-sm font-medium flex justify-between items-center">
              ✏️ Editing: {name}
              <button type="button" onClick={resetForm} className="text-yellow-900 underline text-xs">
                Cancel
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Student Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            required
          />
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
            <option value="">Gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Class (e.g. 10)"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            className={inputCls}
            required
          />
          <input
            type="text"
            placeholder="Section (e.g. A)"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Roll Number"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            className={inputCls}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">Category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Parent Contact"
            value={parentContact}
            onChange={(e) => setParentContact(e.target.value)}
            className={`${inputCls} md:col-span-2`}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update Student' : 'Add Student'}
          </button>
        </form>

        <input
          type="text"
          placeholder="🔍 Search by name, class or roll number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full mb-4 ${inputCls}`}
        />

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
          <table className="w-full text-left text-gray-900 text-sm">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Gender</th>
                <th className="p-3">Class</th>
                <th className="p-3">Section</th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Adm. No</th>
                <th className="p-3">Category</th>
                <th className="p-3">Parent Contact</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id} className="border-t border-gray-200">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.gender || '—'}</td>
                  <td className="p-3">{s.class}</td>
                  <td className="p-3">{s.section}</td>
                  <td className="p-3">{s.roll_number}</td>
                   <td className="p-3">{s.admission_no || '—'}</td>
                  <td className="p-3">{s.category || '—'}</td>
                  <td className="p-3">{s.parent_contact}</td>
                  <td className="p-3 flex gap-3">
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-4 text-center text-gray-400">
                    Koi student nahi mila
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
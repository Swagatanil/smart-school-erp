'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState([])
  const [studentName, setStudentName] = useState('')
  const [parentName, setParentName] = useState('')
  const [contact, setContact] = useState('')
  const [applyingClass, setApplyingClass] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const fetchAdmissions = async () => {
    const { data, error } = await supabase
      .from('admissions')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setAdmissions(data)
    }
  }

  useEffect(() => {
    fetchAdmissions()
  }, [])

  const handleAddEnquiry = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('admissions').insert([
      {
        student_name: studentName,
        parent_name: parentName,
        contact: contact,
        applying_for_class: applyingClass,
        status: 'New',
        notes: notes,
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setStudentName('')
      setParentName('')
      setContact('')
      setApplyingClass('')
      setNotes('')
      fetchAdmissions()
    }
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('admissions').update({ status }).eq('id', id)
    if (!error) fetchAdmissions()
  }

  const handleAdmit = async (admission) => {
    setError('')
    setMessage('')

    const { error: studentError } = await supabase.from('students').insert([
      {
        name: admission.student_name,
        class: admission.applying_for_class,
        section: '',
        roll_number: '',
        parent_contact: admission.contact,
      },
    ])

    if (studentError) {
      setError(studentError.message)
      return
    }

    const { error: updateError } = await supabase
      .from('admissions')
      .update({ status: 'Admitted' })
      .eq('id', admission.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage(`${admission.student_name} ko Students list me add kar diya gaya!`)
      fetchAdmissions()
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('admissions').delete().eq('id', id)
    if (!error) fetchAdmissions()
  }

  const statusColor = (status) => {
    if (status === 'New') return 'bg-blue-100 text-blue-700'
    if (status === 'Contacted') return 'bg-yellow-100 text-yellow-700'
    if (status === 'Visited') return 'bg-purple-100 text-purple-700'
    if (status === 'Admitted') return 'bg-green-100 text-green-700'
    if (status === 'Lost') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📋 Admissions & Enquiry</h1>

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

        <form
          onSubmit={handleAddEnquiry}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            type="text"
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Parent Name"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Applying for Class (e.g. 5)"
            value={applyingClass}
            onChange={(e) => setApplyingClass(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400 md:col-span-2"
            rows="2"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Enquiry'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Parent</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Class</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((a) => (
                <tr key={a.id} className="border-t border-gray-200">
                  <td className="p-3">{a.student_name}</td>
                  <td className="p-3">{a.parent_name}</td>
                  <td className="p-3">{a.contact}</td>
                  <td className="p-3">{a.applying_for_class}</td>
                  <td className="p-3">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusColor(a.status)}`}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Visited">Visited</option>
                      <option value="Admitted">Admitted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </td>
                  <td className="p-3 flex gap-3">
                    {a.status !== 'Admitted' && (
                      <button
                        onClick={() => handleAdmit(a)}
                        className="text-green-600 hover:underline text-sm font-medium"
                      >
                        Admit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-400">
                    Koi enquiry nahi hai abhi
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
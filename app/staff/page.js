'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function StaffPage() {
  const [staffList, setStaffList] = useState([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [subject, setSubject] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setStaffList(data)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleAddStaff = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('staff').insert([
      {
        name,
        role,
        subject,
        contact,
        email,
        joining_date: joiningDate || null,
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setRole('')
      setSubject('')
      setContact('')
      setEmail('')
      setJoiningDate('')
      fetchStaff()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (!error) fetchStaff()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">👩‍🏫 Staff</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleAddStaff}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
            required
          >
            <option value="">Role select karo</option>
            <option value="Teacher">Teacher</option>
            <option value="Principal">Principal</option>
            <option value="Admin Staff">Admin Staff</option>
            <option value="Accountant">Accountant</option>
            <option value="Support Staff">Support Staff</option>
          </select>
          <input
            type="text"
            placeholder="Subject (agar Teacher hai)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Staff'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Email</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.id} className="border-t border-gray-200">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.role}</td>
                  <td className="p-3">{s.subject}</td>
                  <td className="p-3">{s.contact}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-400">
                    Koi staff add nahi hua abhi
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
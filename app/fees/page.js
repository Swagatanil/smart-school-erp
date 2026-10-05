'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function FeesPage() {
  const [students, setStudents] = useState([])
  const [fees, setFees] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name')
    if (data) setStudents(data)
  }

  const fetchFees = async () => {
    const { data, error } = await supabase
      .from('fees')
      .select('*, students!student-id(name, class)')
      .order('due_date')

    if (error) {
      setError(error.message)
    } else {
      setFees(data)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchFees()
  }, [])

  const getStatus = (amount, paid) => {
    if (paid >= amount) return 'Paid'
    if (paid > 0) return 'Partial'
    return 'Unpaid'
  }

  const handleAddFee = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const paid = parseFloat(paidAmount) || 0
    const total = parseFloat(amount)
    const status = getStatus(total, paid)

    const { error } = await supabase.from('fees').insert([
      {
        'student-id': selectedStudent,
        amount: total,
        paid_amount: paid,
        due_date: dueDate,
        status: status,
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setSelectedStudent('')
      setAmount('')
      setPaidAmount('')
      setDueDate('')
      fetchFees()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('fees').delete().eq('id', id)
    if (!error) fetchFees()
  }

  const statusColor = (status) => {
    if (status === 'Paid') return 'bg-green-100 text-green-700'
    if (status === 'Partial') return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">💰 Fees</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleAddFee}
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
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900"
            required
          />

          <input
            type="number"
            placeholder="Total Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />

          <input
            type="number"
            placeholder="Paid Amount (optional)"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Fee Record'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Total</th>
                <th className="p-3">Paid</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id} className="border-t border-gray-200">
                  <td className="p-3">{f.students?.name || '—'}</td>
                  <td className="p-3">{f.due_date}</td>
                  <td className="p-3">₹{f.amount}</td>
                  <td className="p-3">₹{f.paid_amount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(f.status)}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {fees.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-400">
                    Koi fee record nahi hai abhi
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
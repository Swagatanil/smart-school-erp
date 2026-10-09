'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function FeeStructurePage() {
  const [structures, setStructures] = useState([])
  const [className, setClassName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchStructures = async () => {
    const { data, error } = await supabase
      .from('fee_structure')
      .select('*')
      .order('class')

    if (error) {
      setError(error.message)
    } else {
      setStructures(data)
    }
  }

  useEffect(() => {
    fetchStructures()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('fee_structure').insert([
      {
        class: className,
        category: category,
        amount: parseFloat(amount),
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setClassName('')
      setCategory('')
      setAmount('')
      fetchStructures()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('fee_structure').delete().eq('id', id)
    if (!error) fetchStructures()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">💵 Fee Structure</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Har class aur category (RTE/Self-Finance/General) ke liye fee amount set karo. Jab koi student usi class+category me admit hoga, uski fee automatically is amount se set ho jayegi.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleAdd}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <input
            type="text"
            placeholder="Class (e.g. 10)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
            required
          >
            <option value="">Category</option>
            <option value="RTE">RTE</option>
            <option value="Self-Finance">Self-Finance</option>
            <option value="General">General</option>
            <option value="EWS">EWS</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
          </select>
          <input
            type="number"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Class</th>
                <th className="p-3">Category</th>
                <th className="p-3">Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id} className="border-t border-gray-200">
                  <td className="p-3">{s.class}</td>
                  <td className="p-3">{s.category}</td>
                  <td className="p-3">₹{s.amount}</td>
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
              {structures.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-400">
                    Koi fee structure set nahi hai abhi
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
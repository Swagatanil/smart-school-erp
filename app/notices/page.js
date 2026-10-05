'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function NoticesPage() {
  const [notices, setNotices] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [postedBy, setPostedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setNotices(data)
    }
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const handleAddNotice = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('notices').insert([
      {
        title,
        message,
        posted_by: postedBy || 'Admin',
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setTitle('')
      setMessage('')
      setPostedBy('')
      fetchNotices()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('notices').delete().eq('id', id)
    if (!error) fetchNotices()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📢 Notice Board</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleAddNotice}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 gap-4"
        >
          <input
            type="text"
            placeholder="Notice Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            rows="3"
            required
          />
          <input
            type="text"
            placeholder="Posted By (optional, e.g. Principal)"
            value={postedBy}
            onChange={(e) => setPostedBy(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Notice'}
          </button>
        </form>

        <div className="space-y-4">
          {notices.map((n) => (
            <div key={n.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-800">{n.title}</h3>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-red-600 hover:underline text-sm font-medium"
                >
                  Delete
                </button>
              </div>
              <p className="text-gray-600 mt-2">{n.message}</p>
              <p className="text-xs text-gray-400 mt-3">Posted by: {n.posted_by}</p>
            </div>
          ))}
          {notices.length === 0 && (
            <p className="text-center text-gray-400 py-8">Koi notice nahi hai abhi</p>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function Dashboard() {
  const [notices, setNotices] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const fetchNotices = async () => {
      const { data } = await supabase
        .from('notices')
        .select('*')
        .order('id', { ascending: false })
        .limit(3)
      if (data) setNotices(data)
    }
    fetchNotices()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome to School ERP Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Login successful!</p>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-indigo-700 mb-4">📢 Latest Notices</h2>
          {notices.length === 0 && (
            <p className="text-gray-400 text-sm">Koi notice nahi hai abhi</p>
          )}
          {notices.map((n) => (
            <div key={n.id} className="border-t border-gray-100 py-3 first:border-t-0 first:pt-0">
              <h3 className="font-semibold text-gray-800">{n.title}</h3>
              <p className="text-gray-600 text-sm">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
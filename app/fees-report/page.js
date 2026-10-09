'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'
import ClassPicker from '@/components/ClassPicker'

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

const TABS = [
  { key: 'all', label: 'Sab' },
  { key: 'pending', label: 'Baaki hai' },
  { key: 'paid', label: 'Paid' },
  { key: 'nofee', label: 'Fee record nahi' },
]

const statusOf = (r) => {
  if (!r.hasFee) return 'Fee record nahi'
  if (r.pending <= 0) return 'Paid'
  if (r.paid > 0) return 'Partial'
  return 'Unpaid'
}

const statusColor = (s) => {
  if (s === 'Paid') return 'bg-green-100 text-green-700'
  if (s === 'Partial') return 'bg-yellow-100 text-yellow-700'
  if (s === 'Unpaid') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

export default function FeesReportPage() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [rows, setRows] = useState([])
  const [view, setView] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await fetchAll(() => supabase.from('students').select('id, class'))
        const list = [...new Set(data.map((r) => r.class).filter(Boolean))].sort((a, b) =>
          String(a).localeCompare(String(b), undefined, { numeric: true })
        )
        setClasses(list)
      } catch (e) {
        setError(e.message)
      }
    }
    loadClasses()
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    const load = async () => {
      setLoading(true)
      setError('')
      const { data: st, error: e1 } = await supabase
        .from('students')
        .select('id, name, section, roll_number, parent_contact')
        .eq('class', selectedClass)
        .order('name')
      if (e1) {
        setError(e1.message)
        setLoading(false)
        return
      }

      const agg = {}
      const ids = st.map((s) => s.id)
      if (ids.length > 0) {
        const { data: fees, error: e2 } = await supabase
          .from('fees')
          .select('*')
          .in('student-id', ids)
        if (e2) {
          setError(e2.message)
          setLoading(false)
          return
        }
        fees.forEach((f) => {
          const k = f['student-id']
          if (!agg[k]) agg[k] = { total: 0, paid: 0 }
          agg[k].total += Number(f.amount)
          agg[k].paid += Number(f.paid_amount)
        })
      }

      setRows(
        st.map((s) => {
          const a = agg[s.id]
          const total = a ? a.total : 0
          const paid = a ? a.paid : 0
          return { ...s, hasFee: !!a, total, paid, pending: Math.max(total - paid, 0) }
        })
      )
      setLoading(false)
    }
    load()
  }, [selectedClass])

  const totalFee = rows.reduce((s, r) => s + r.total, 0)
  const collected = rows.reduce((s, r) => s + r.paid, 0)
  const pendingSum = rows.reduce((s, r) => s + r.pending, 0)
  const pendingPct = totalFee > 0 ? Math.round((pendingSum / totalFee) * 100) : null

  let shown = rows.filter((r) => {
    if (view === 'pending') return r.hasFee && r.pending > 0
    if (view === 'paid') return r.hasFee && r.pending <= 0
    if (view === 'nofee') return !r.hasFee
    return true
  })
  if (view === 'pending') shown = [...shown].sort((a, b) => b.pending - a.pending)

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-yellow-700">💰 Fees Report</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm font-medium">
            ← Dashboard
          </Link>
        </div>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        {!selectedClass ? (
          <ClassPicker
            classes={classes}
            onPick={setSelectedClass}
            title="Kis class ki fees dekhni hai?"
            hint="Class chuno, phir us class ke students aur unka baaki fee dikhega."
          />
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex items-center gap-4">
              <span className="font-bold text-gray-800">Class {selectedClass}</span>
              <button
                onClick={() => {
                  setSelectedClass(null)
                  setRows([])
                  setView('all')
                }}
                className="text-indigo-600 hover:underline text-sm"
              >
                Class badlo
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 text-yellow-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{pendingPct === null ? '—' : pendingPct + '%'}</div>
                <div className="text-sm font-medium">Fees Baaki %</div>
              </div>
              <div className="bg-indigo-50 text-indigo-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-2xl font-bold">{money(totalFee)}</div>
                <div className="text-sm font-medium">Kul Fee</div>
              </div>
              <div className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-2xl font-bold">{money(collected)}</div>
                <div className="text-sm font-medium">Jama</div>
              </div>
              <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-2xl font-bold">{money(pendingSum)}</div>
                <div className="text-sm font-medium">Baaki</div>
              </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className={`px-4 py-1 rounded-full text-sm font-semibold border transition ${
                    view === t.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-gray-900 text-sm">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Parent Contact</th>
                    <th className="p-3">Kul Fee</th>
                    <th className="p-3">Jama</th>
                    <th className="p-3">Baaki</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const s = statusOf(r)
                    return (
                      <tr key={r.id} className="border-t border-gray-200">
                        <td className="p-3">{r.name}</td>
                        <td className="p-3">{r.section}</td>
                        <td className="p-3">{r.parent_contact}</td>
                        <td className="p-3">{r.hasFee ? money(r.total) : '—'}</td>
                        <td className="p-3">{r.hasFee ? money(r.paid) : '—'}</td>
                        <td className="p-3 font-semibold">{r.hasFee ? money(r.pending) : '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(s)}`}>
                            {s}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {!loading && shown.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-gray-400">
                        Koi student nahi mila
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
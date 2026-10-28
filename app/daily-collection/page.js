'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'
import { useSchool } from '@/lib/useSchool'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayStr = () => ymd(new Date())
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const receiptNo = (id) => 'RCPT-' + String(id).padStart(6, '0')
const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, dd] = String(d).slice(0, 10).split('-')
  return `${dd}/${m}/${y}`
}
const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export default function DailyCollectionPage() {
  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())
  const [mode, setMode] = useState('all')
  const [who, setWho] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()
  const school = useSchool()

  useEffect(() => {
    if (!from || !to) return
    if (from > to) {
      setError('From date, To date se badi nahi ho sakti')
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const pays = await fetchAll(() =>
          supabase.from('fee_payments').select('*').gte('paid_on', from).lte('paid_on', to)
        )

        const feeIds = [...new Set(pays.map((p) => p.fee_id))]
        const feeMap = {}
        for (let i = 0; i < feeIds.length; i += 50) {
          const { data, error } = await supabase.from('fees').select('*').in('id', feeIds.slice(i, i + 50))
          if (error) throw error
          data.forEach((f) => {
            feeMap[f.id] = f['student-id']
          })
        }

        const stIds = [...new Set(Object.values(feeMap))]
        const stMap = {}
        for (let i = 0; i < stIds.length; i += 50) {
          const { data, error } = await supabase
            .from('students')
            .select('id, name, class, section, roll_number')
            .in('id', stIds.slice(i, i + 50))
          if (error) throw error
          data.forEach((s) => {
            stMap[s.id] = s
          })
        }

        const names = {}
        const { data: sf } = await supabase.from('staff').select('email, name')
        ;(sf || []).forEach((s) => {
          if (s.email) names[s.email.toLowerCase()] = s.name
        })

        const out = pays
          .map((p) => {
            const st = stMap[feeMap[p.fee_id]]
            return {
              ...p,
              studentName: st ? st.name : '—',
              cls: st ? `${st.class} ${st.section || ''}`.trim() : '—',
              by: p.received_by ? names[p.received_by.toLowerCase()] || p.received_by : '—',
            }
          })
          .sort((a, b) => a.id - b.id)

        if (!cancelled) setRows(out)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Data load nahi hua')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [from, to])

  const setToday = () => {
    const t = todayStr()
    setFrom(t)
    setTo(t)
  }
  const setYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const t = ymd(d)
    setFrom(t)
    setTo(t)
  }
  const setThisMonth = () => {
    const d = new Date()
    setFrom(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`)
    setTo(todayStr())
  }

  const modes = [...new Set(rows.map((r) => r.mode || 'Other'))].sort()
  const whos = [...new Set(rows.map((r) => r.by))].sort()

  const filtered = rows.filter(
    (r) => (mode === 'all' || (r.mode || 'Other') === mode) && (who === 'all' || r.by === who)
  )
  const active = filtered.filter((r) => !r.reversed_at)
  const reversed = filtered.filter((r) => r.reversed_at)

  const total = active.reduce((a, r) => a + Number(r.amount), 0)
  const reversedTotal = reversed.reduce((a, r) => a + Number(r.amount), 0)

  const byMode = {}
  active.forEach((r) => {
    const k = r.mode || 'Other'
    byMode[k] = (byMode[k] || 0) + Number(r.amount)
  })
  const byWho = {}
  active.forEach((r) => {
    byWho[r.by] = (byWho[r.by] || 0) + Number(r.amount)
  })

  const downloadCsv = () => {
    const header = ['Receipt', 'Date', 'Student', 'Class', 'Amount', 'Mode', 'Received by', 'Note', 'Status']
    const lines = [header.join(',')]
    filtered.forEach((r) => {
      lines.push(
        [
          receiptNo(r.id),
          fmtDate(r.paid_on),
          r.studentName,
          r.cls,
          r.amount,
          r.mode || '',
          r.by,
          r.note || '',
          r.reversed_at ? 'Reversed' : 'OK',
        ]
          .map(csvCell)
          .join(',')
      )
    })
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `collection_${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const rangeLabel = from === to ? fmtDate(from) : `${fmtDate(from)} se ${fmtDate(to)}`

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <style>{`@media print { nav, .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="max-w-5xl mx-auto">
        <div className="no-print flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-indigo-700">💵 Daily Collection</h1>
          <Link href="/fee-collect" className="text-indigo-600 hover:underline text-sm font-medium">
            Fee Collect →
          </Link>
        </div>
        <p className="no-print text-gray-500 text-sm mb-6">
          Kis din kitna paisa aaya, kis mode me, aur kisne liya. Din ke end me Cash wala total apne paas ke paise se
          milao.
        </p>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">{school.name}</h2>
          <p className="text-sm">Collection Report: {rangeLabel}</p>
        </div>

        {error && (
          <p className="no-print bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        <div className="no-print bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={setToday} className="px-3 py-2 rounded-lg border border-indigo-300 text-indigo-700 text-sm hover:bg-indigo-50">
              Aaj
            </button>
            <button onClick={setYesterday} className="px-3 py-2 rounded-lg border border-indigo-300 text-indigo-700 text-sm hover:bg-indigo-50">
              Kal
            </button>
            <button onClick={setThisMonth} className="px-3 py-2 rounded-lg border border-indigo-300 text-indigo-700 text-sm hover:bg-indigo-50">
              Is mahine
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
              <option value="all">Sab</option>
              {modes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kisne liya</label>
            <select value={who} onChange={(e) => setWho(e.target.value)} className={inputCls}>
              <option value="all">Sab</option>
              {whos.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-indigo-50 text-indigo-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-2xl font-bold">{money(total)}</div>
                <div className="text-sm font-medium">Kul collection</div>
                <div className="text-xs mt-1">{active.length} receipts</div>
              </div>
              {Object.keys(byMode)
                .sort()
                .map((m) => (
                  <div key={m} className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
                    <div className="text-2xl font-bold">{money(byMode[m])}</div>
                    <div className="text-sm font-medium">{m}</div>
                  </div>
                ))}
              {reversed.length > 0 && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
                  <div className="text-2xl font-bold">{money(reversedTotal)}</div>
                  <div className="text-sm font-medium">Reverse hui</div>
                  <div className="text-xs mt-1">{reversed.length} receipts (total me nahi)</div>
                </div>
              )}
            </div>

            {Object.keys(byWho).length > 1 && (
              <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-4">
                <h3 className="font-bold text-gray-800 mb-2">Kisne kitna liya</h3>
                {Object.keys(byWho)
                  .sort()
                  .map((w) => (
                    <div key={w} className="flex justify-between text-sm py-1 border-t border-gray-100 first:border-t-0">
                      <span>{w}</span>
                      <span className="font-semibold">{money(byWho[w])}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="no-print flex gap-3 mb-4">
              <button
                onClick={() => window.print()}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
              >
                🖨️ Print
              </button>
              <button
                onClick={downloadCsv}
                disabled={filtered.length === 0}
                className="border-2 border-indigo-600 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition disabled:opacity-50"
              >
                ⬇️ CSV download
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-900">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="p-3">Receipt</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Kisne liya</th>
                    <th className="p-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-gray-100 ${r.reversed_at ? 'bg-red-50 text-gray-500 line-through' : ''}`}
                      title={r.reversed_at ? `Reverse: ${r.reverse_reason || ''}` : ''}
                    >
                      <td className="p-3 whitespace-nowrap">{receiptNo(r.id)}</td>
                      <td className="p-3 whitespace-nowrap">{fmtDate(r.paid_on)}</td>
                      <td className="p-3">{r.studentName}</td>
                      <td className="p-3 whitespace-nowrap">{r.cls}</td>
                      <td className="p-3 font-semibold whitespace-nowrap">{money(r.amount)}</td>
                      <td className="p-3">{r.mode || '—'}</td>
                      <td className="p-3">{r.by}</td>
                      <td className="p-3">{r.note || ''}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-6 text-center text-gray-400">
                        Is date me koi payment nahi mili
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="no-print text-xs text-gray-500 mt-3">
              Ye report payment ki <strong>date</strong> (jo Fee Collect me daali jati hai) ke hisaab se banti hai.
              Reverse hui payments laal aur kati hui dikhti hain, aur total me nahi judti.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

const SCHOOL = 'ABC Public School'
const MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer']

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const receiptNo = (id) => 'RCPT-' + String(id).padStart(6, '0')
const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, dd] = String(d).slice(0, 10).split('-')
  return `${dd}/${m}/${y}`
}

const statusOf = (fee) => {
  const total = Number(fee.amount)
  const paid = Number(fee.paid_amount || 0)
  if (paid >= total) return 'Paid'
  if (paid > 0) return 'Partial'
  return 'Unpaid'
}
const statusColor = (s) => {
  if (s === 'Paid') return 'bg-green-100 text-green-700'
  if (s === 'Partial') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const buildReceipt = (paymentId, fees, pays, student) => {
  const p = pays.find((x) => x.id === paymentId)
  if (!p) return null
  const fee = fees.find((x) => x.id === p.fee_id)
  if (!fee) return null
  const feePays = pays.filter((x) => x.fee_id === fee.id)
  const sumAll = feePays.reduce((a, x) => a + Number(x.amount), 0)
  const base = Math.max(Number(fee.paid_amount || 0) - sumAll, 0)
  let cum = base
  for (const x of feePays) {
    cum += Number(x.amount)
    if (x.id === p.id) break
  }
  return {
    payment: p,
    fee,
    student,
    totalFee: Number(fee.amount),
    paidTillNow: cum,
    balance: Math.max(Number(fee.amount) - cum, 0),
  }
}

export default function FeeCollectPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [student, setStudent] = useState(null)
  const [fees, setFees] = useState([])
  const [payments, setPayments] = useState([])
  const [forms, setForms] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const search = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const t = query.trim().replace(/[^\p{L}\p{N}\s.\-/]/gu, '')
    if (!t) return
    const { data, error } = await supabase
      .from('students')
      .select('id, name, class, section, roll_number, admission_no, father_name, parent_contact')
      .or(`name.ilike.%${t}%,roll_number.ilike.%${t}%,admission_no.ilike.%${t}%`)
      .order('name')
      .limit(20)
    if (error) {
      setError(error.message)
      return
    }
    setResults(data)
    setSearched(true)
  }

  const loadStudent = async (s) => {
    const { data: fe, error: e1 } = await supabase
      .from('fees')
      .select('*')
      .eq('student-id', s.id)
      .order('id')
    if (e1) {
      setError(e1.message)
      return null
    }
    const ids = fe.map((f) => f.id)
    let pays = []
    if (ids.length > 0) {
      const { data, error: e2 } = await supabase
        .from('fee_payments')
        .select('*')
        .in('fee_id', ids)
        .order('id')
      if (e2) {
        setError(e2.message)
        return null
      }
      pays = data
    }
    const f = {}
    fe.forEach((x) => {
      const pend = Math.max(Number(x.amount) - Number(x.paid_amount || 0), 0)
      f[x.id] = { amount: pend > 0 ? String(pend) : '', mode: 'Cash', paid_on: todayStr(), note: '' }
    })
    setStudent(s)
    setFees(fe)
    setPayments(pays)
    setForms(f)
    return { fe, pays }
  }

  const pickStudent = async (s) => {
    setError('')
    setMessage('')
    setReceipt(null)
    await loadStudent(s)
  }

  const setField = (feeId, key, val) =>
    setForms((prev) => ({ ...prev, [feeId]: { ...prev[feeId], [key]: val } }))

  const collect = async (fee) => {
    setError('')
    setMessage('')
    const form = forms[fee.id]
    const amt = Number(form.amount)
    const pending = Math.max(Number(fee.amount) - Number(fee.paid_amount || 0), 0)
    if (!amt || amt <= 0) {
      setError('Amount daalo')
      return
    }
    if (amt > pending) {
      setError(`Amount baaki fee (${money(pending)}) se zyada nahi ho sakta`)
      return
    }

    setSavingId(fee.id)
    const { data: newId, error } = await supabase.rpc('record_payment', {
      p_fee_id: fee.id,
      p_amount: amt,
      p_mode: form.mode,
      p_paid_on: form.paid_on,
      p_note: form.note || null,
    })
    if (error) {
      setError(error.message)
      setSavingId(null)
      return
    }

    const res = await loadStudent(student)
    if (res) {
      setReceipt(buildReceipt(newId, res.fe, res.pays, student))
      setMessage('Payment record ho gayi! Receipt neeche/upar dikh rahi hai.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setSavingId(null)
  }

  const showReceipt = (p) => {
    setReceipt(buildReceipt(p.id, fees, payments, student))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white placeholder-gray-400 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  const history = [...payments].sort((a, b) => b.id - a.id)

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <style>{`@media print { nav, .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="max-w-3xl mx-auto">
        <div className="no-print flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-indigo-700">🧾 Fee Collect</h1>
          <Link href="/fees-report" className="text-indigo-600 hover:underline text-sm font-medium">
            Fees Report →
          </Link>
        </div>
        <p className="no-print text-gray-500 text-sm mb-6">
          Student dhoondo, payment lo, aur receipt print karo.
        </p>

        {error && (
          <p className="no-print bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">
            {error}
          </p>
        )}
        {message && (
          <p className="no-print bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            {message}
          </p>
        )}

        {/* ---------- Receipt ---------- */}
        {receipt && (
          <div className="mb-6">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-300">
              <div className="text-center border-b-2 border-indigo-700 pb-3 mb-4">
                <div className="text-3xl">🏫</div>
                <h2 className="text-xl font-bold text-gray-900">{SCHOOL}</h2>
                <p className="text-sm text-gray-500">Fee Receipt</p>
              </div>

              <div className="flex justify-between text-sm mb-4 text-gray-800">
                <span>
                  Receipt No: <strong>{receiptNo(receipt.payment.id)}</strong>
                </span>
                <span>
                  Date: <strong>{fmtDate(receipt.payment.paid_on)}</strong>
                </span>
              </div>

              <div className="text-sm text-gray-800 space-y-1 mb-4">
                <p>
                  Student: <strong>{receipt.student.name}</strong>
                </p>
                {receipt.student.father_name && <p>Father: {receipt.student.father_name}</p>}
                <p>
                  Class: {receipt.student.class} {receipt.student.section || ''}
                  {receipt.student.roll_number ? ` • Roll No: ${receipt.student.roll_number}` : ''}
                  {receipt.student.admission_no ? ` • Adm. No: ${receipt.student.admission_no}` : ''}
                </p>
              </div>

              <div className="border border-gray-300 rounded-lg text-sm text-gray-900">
                <div className="flex justify-between p-2 border-b border-gray-200">
                  <span>Kul fee</span>
                  <span>{money(receipt.totalFee)}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-gray-200 bg-green-50 font-bold">
                  <span>Is baar jama ({receipt.payment.mode || '—'})</span>
                  <span>{money(receipt.payment.amount)}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-gray-200">
                  <span>Ab tak kul jama</span>
                  <span>{money(receipt.paidTillNow)}</span>
                </div>
                <div className="flex justify-between p-2 font-semibold">
                  <span>Baaki</span>
                  <span>{money(receipt.balance)}</span>
                </div>
              </div>

              {receipt.payment.note && (
                <p className="text-xs text-gray-500 mt-3">Note: {receipt.payment.note}</p>
              )}

              <div className="mt-12 flex justify-between items-end">
                <p className="text-xs text-gray-400">Computer generated receipt</p>
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 w-40 mb-1"></div>
                  <p className="text-sm text-gray-600">Authorised Signature</p>
                </div>
              </div>
            </div>

            <div className="no-print flex gap-3 mt-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gray-700 text-white p-2 rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Band karo
              </button>
            </div>
          </div>
        )}

        {/* ---------- Search ---------- */}
        <div className="no-print">
          <form
            onSubmit={search}
            className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-4 flex gap-3"
          >
            <input
              type="text"
              placeholder="🔍 Naam, roll number ya admission no..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`flex-1 ${inputCls}`}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Dhoondo
            </button>
          </form>

          {searched && results.length === 0 && (
            <p className="text-center text-gray-400 py-6">Koi student nahi mila</p>
          )}

          {results.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6 overflow-hidden">
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickStudent(s)}
                  className={`w-full text-left px-4 py-2 border-t border-gray-100 first:border-t-0 text-sm hover:bg-indigo-50 ${
                    student && student.id === s.id ? 'bg-indigo-50 font-semibold' : ''
                  }`}
                >
                  {s.name}
                  <span className="text-gray-400">
                    {' '}
                    — Class {s.class} {s.section || ''}
                    {s.roll_number ? ` • Roll ${s.roll_number}` : ''}
                    {s.father_name ? ` • ${s.father_name}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ---------- Selected student ---------- */}
          {student && (
            <>
              <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-4">
                <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
                <p className="text-sm text-gray-500">
                  Class {student.class} {student.section || ''}
                  {student.roll_number ? ` • Roll ${student.roll_number}` : ''}
                  {student.parent_contact ? ` • ${student.parent_contact}` : ''}
                </p>
              </div>

              {fees.length === 0 && (
                <p className="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg mb-4 text-sm">
                  Is student ki fee abhi generate nahi hui.{' '}
                  <Link href="/fee-generate" className="underline font-medium">
                    Fee Generate page
                  </Link>{' '}
                  se banao.
                </p>
              )}

              {fees.map((fee) => {
                const total = Number(fee.amount)
                const paid = Number(fee.paid_amount || 0)
                const pending = Math.max(total - paid, 0)
                const st = statusOf(fee)
                const form = forms[fee.id] || {}
                const recorded = payments
                  .filter((p) => p.fee_id === fee.id)
                  .reduce((a, p) => a + Number(p.amount), 0)
                const oldPaid = Math.max(paid - recorded, 0)

                return (
                  <div key={fee.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-gray-800">Fee — due {fmtDate(fee.due_date)}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(st)}`}>{st}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center mb-3">
                      <div className="bg-indigo-50 text-indigo-700 rounded-lg p-2">
                        <div className="font-bold">{money(total)}</div>
                        <div className="text-xs">Kul fee</div>
                      </div>
                      <div className="bg-green-50 text-green-700 rounded-lg p-2">
                        <div className="font-bold">{money(paid)}</div>
                        <div className="text-xs">Jama</div>
                      </div>
                      <div className="bg-red-50 text-red-700 rounded-lg p-2">
                        <div className="font-bold">{money(pending)}</div>
                        <div className="text-xs">Baaki</div>
                      </div>
                    </div>

                    {oldPaid > 0 && (
                      <p className="text-xs text-gray-500 mb-3">
                        {money(oldPaid)} pehle se jama hai (purani entry, uski receipt nahi hai).
                      </p>
                    )}

                    {pending > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Amount"
                          value={form.amount ?? ''}
                          onChange={(e) => setField(fee.id, 'amount', e.target.value)}
                          className={inputCls}
                        />
                        <select
                          value={form.mode || 'Cash'}
                          onChange={(e) => setField(fee.id, 'mode', e.target.value)}
                          className={inputCls}
                        >
                          {MODES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={form.paid_on || todayStr()}
                          onChange={(e) => setField(fee.id, 'paid_on', e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="text"
                          placeholder="Note (optional, jaise UPI ref no.)"
                          value={form.note || ''}
                          onChange={(e) => setField(fee.id, 'note', e.target.value)}
                          className={inputCls}
                        />
                        <button
                          onClick={() => collect(fee)}
                          disabled={savingId === fee.id}
                          className="md:col-span-2 bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                          {savingId === fee.id ? 'Saving...' : 'Payment lo aur receipt banao'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-green-700 text-sm font-medium">✅ Poori fee jama ho chuki hai.</p>
                    )}
                  </div>
                )
              })}

              {history.length > 0 && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
                  <h3 className="font-bold text-gray-800 p-4 border-b border-gray-200">Payment history</h3>
                  <table className="w-full text-left text-sm text-gray-900">
                    <thead className="bg-indigo-50 text-indigo-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Receipt</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p) => (
                        <tr key={p.id} className="border-t border-gray-100">
                          <td className="p-3">{fmtDate(p.paid_on)}</td>
                          <td className="p-3">{receiptNo(p.id)}</td>
                          <td className="p-3 font-semibold">{money(p.amount)}</td>
                          <td className="p-3">{p.mode || '—'}</td>
                          <td className="p-3">
                            <button
                              onClick={() => showReceipt(p)}
                              className="text-indigo-600 hover:underline font-medium"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
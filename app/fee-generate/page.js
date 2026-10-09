'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const norm = (v) => String(v ?? '').trim().toLowerCase()
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

export default function FeeGeneratePage() {
  const [students, setStudents] = useState([])
  const [structure, setStructure] = useState([])
  const [hasFee, setHasFee] = useState(new Set())
  const [classFilter, setClassFilter] = useState('all')
  const [dueDate, setDueDate] = useState(todayStr())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const st = await fetchAll(() =>
        supabase.from('students').select('id, name, class, section, category')
      )
      const fs = await fetchAll(() => supabase.from('fee_structure').select('*'))
      const fe = await fetchAll(() => supabase.from('fees').select('*'))
      setStudents(st)
      setStructure(fs)
      setHasFee(new Set(fe.map((f) => f['student-id'])))
    } catch (e) {
      setError(e.message || 'Data load nahi hua')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // ---- hisaab ----
  const feeMap = {}
  structure.forEach((f) => {
    const k = norm(f.class) + '|' + norm(f.category)
    if (!(k in feeMap)) feeMap[k] = Number(f.amount)
  })

  const classes = [...new Set(students.map((s) => s.class).filter(Boolean))].sort(natural)
  const inScope = students.filter((s) => classFilter === 'all' || s.class === classFilter)

  const alreadyHave = inScope.filter((s) => hasFee.has(s.id))
  const pending = inScope.filter((s) => !hasFee.has(s.id))

  const ready = []
  const noCategory = []
  const noStructure = []
  pending.forEach((s) => {
    if (!norm(s.category)) {
      noCategory.push(s)
      return
    }
    const k = norm(s.class) + '|' + norm(s.category)
    if (k in feeMap) ready.push({ ...s, amount: feeMap[k] })
    else noStructure.push(s)
  })
  const totalAmount = ready.reduce((a, s) => a + s.amount, 0)
  const skipped = noCategory.length + noStructure.length

  const generate = async () => {
    if (ready.length === 0) return
    setGenerating(true)
    setError('')
    setResult(null)

    try {
      // Dobara taaza check, taaki kisi ki fee do baar na bane
      const fe = await fetchAll(() => supabase.from('fees').select('*'))
      const fresh = new Set(fe.map((f) => f['student-id']))
      const toInsert = ready.filter((s) => !fresh.has(s.id))

      let inserted = 0
      let failed = 0
      let firstError = ''

      for (let i = 0; i < toInsert.length; i += 200) {
        const batch = toInsert.slice(i, i + 200).map((s) => ({
          'student-id': s.id,
          amount: s.amount,
          paid_amount: 0,
          due_date: dueDate,
          status: s.amount > 0 ? 'Unpaid' : 'Paid',
        }))
        const { error } = await supabase.from('fees').insert(batch)
        if (error) {
          failed += batch.length
          if (!firstError) firstError = error.message
        } else {
          inserted += batch.length
        }
      }

      setResult({
        inserted,
        failed,
        firstError,
        raceSkipped: ready.length - toInsert.length,
      })
      await load()
    } catch (e) {
      setError(e.message || 'Kuch galat hua')
    }
    setGenerating(false)
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  const ProblemList = ({ title, hint, list, color }) =>
    list.length === 0 ? null : (
      <div className={`border rounded-lg p-3 mb-3 ${color}`}>
        <p className="text-sm font-semibold mb-1">
          {title} ({list.length})
        </p>
        <p className="text-xs mb-2">{hint}</p>
        <div className="max-h-40 overflow-y-auto text-xs space-y-0.5">
          {list.slice(0, 40).map((s) => (
            <div key={s.id}>
              {s.name} — Class {s.class} {s.section || ''}
              {s.category ? ` (${s.category})` : ''}
            </div>
          ))}
          {list.length > 40 && <div>...aur {list.length - 40} students</div>}
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-indigo-700">⚙️ Fee Generate</h1>
          <Link href="/fees-report" className="text-indigo-600 hover:underline text-sm font-medium">
            Fees Report →
          </Link>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Fee Structure ke hisaab se students ki fee ek click me banao. Jin students ki fee pehle se hai, unhe chhua nahi
          jayega.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        {result && (
          <div className="bg-green-50 text-green-800 border border-green-300 p-3 rounded-lg mb-4 text-sm">
            <p>✅ {result.inserted} students ki fee ban gayi.</p>
            {result.raceSkipped > 0 && (
              <p>♻️ {result.raceSkipped} ki fee beech me kisi aur ne bana di thi, unhe skip kiya.</p>
            )}
            {result.failed > 0 && (
              <p className="text-red-700">
                ⚠️ {result.failed} rows save nahi hui: {result.firstError}
              </p>
            )}
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputCls}>
              <option value="all">Sab classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fee ki due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 text-indigo-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{inScope.length}</div>
                <div className="text-sm font-medium">Students</div>
              </div>
              <div className="bg-gray-100 text-gray-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{alreadyHave.length}</div>
                <div className="text-sm font-medium">Fee pehle se hai</div>
              </div>
              <div className="bg-green-50 text-green-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{ready.length}</div>
                <div className="text-sm font-medium">Fee banegi</div>
              </div>
              <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center shadow-md">
                <div className="text-3xl font-bold">{skipped}</div>
                <div className="text-sm font-medium">Skip hongi</div>
              </div>
            </div>

            <ProblemList
              title="❌ Category khali hai"
              hint="Students page se inki category bharo, phir dobara aao."
              list={noCategory}
              color="bg-red-50 border-red-200 text-red-700"
            />
            <ProblemList
              title="⚠️ Is class + category ki fee Fee Structure me set nahi hai"
              hint="Fee Structure page me inke liye fee set karo, phir dobara aao."
              list={noStructure}
              color="bg-orange-50 border-orange-200 text-orange-800"
            />

            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
              <p className="text-sm text-gray-700 mb-3">
                {ready.length > 0
                  ? `${ready.length} students ki fee banegi, kul ${money(totalAmount)}, due date ${dueDate}.`
                  : 'Abhi koi nayi fee banane ke liye nahi hai.'}
              </p>
              <button
                onClick={generate}
                disabled={generating || ready.length === 0}
                className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {generating ? 'Fee ban rahi hai...' : `Fee generate karo (${ready.length} students)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
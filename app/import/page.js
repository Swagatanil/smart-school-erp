'use client'
import { useState } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabaseClient'

const CATEGORIES = ['RTE', 'Self-Finance', 'General', 'EWS']
const ROLES = ['Teacher', 'Principal', 'Admin Staff', 'Accountant', 'Support Staff']

const TYPES = {
  students: {
    label: '🎓 Students',
    table: 'students',
    uniqueKeys: ['admission_no'],
    note: 'Pehle Fee Structure import/set kar lo, phir Students.',
    columns: [
      { key: 'name', required: true, sample: 'Rahul Sharma' },
      { key: 'class', required: true, sample: '5' },
      { key: 'section', sample: 'A' },
      { key: 'roll_number', sample: '12' },
      { key: 'parent_contact', type: 'phone', sample: '9876543210' },
      { key: 'father_name', sample: 'Suresh Sharma' },
      { key: 'mother_name', sample: 'Sunita Sharma' },
      { key: 'apaar_id', sample: '' },
      { key: 'parent_pan', sample: '' },
      { key: 'admission_no', sample: 'ADM001' },
      { key: 'category', allowed: CATEGORIES, sample: 'General' },
    ],
  },
  staff: {
    label: '👩‍🏫 Staff',
    table: 'staff',
    uniqueKeys: ['email'],
    note: 'Staff ka email wahi daalo jisse wo login karega.',
    columns: [
      { key: 'name', required: true, sample: 'Ramesh Kumar' },
      { key: 'role', required: true, allowed: ROLES, sample: 'Teacher' },
      { key: 'subject', sample: 'Maths' },
      { key: 'contact', type: 'phone', sample: '9876500000' },
      { key: 'email', sample: 'ramesh@school.com' },
      { key: 'joining_date', type: 'date', sample: '2024-04-01' },
    ],
  },
  fee_structure: {
    label: '💵 Fee Structure',
    table: 'fee_structure',
    uniqueKeys: ['class', 'category'],
    note: 'Ek class + category ki sirf ek fee honi chahiye.',
    columns: [
      { key: 'class', required: true, sample: '5' },
      { key: 'category', required: true, allowed: CATEGORIES, sample: 'General' },
      { key: 'amount', required: true, type: 'number', sample: '15000' },
    ],
  },
}

const cleanPhone = (v) => {
  let n = String(v || '').replace(/\D/g, '')
  if (n.length === 12 && n.startsWith('91')) n = n.slice(2)
  if (n.length === 11 && n.startsWith('0')) n = n.slice(1)
  return n
}

const toIsoDate = (v) => {
  let y, mo, d
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    y = +m[1]; mo = +m[2]; d = +m[3]
  } else {
    m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
    if (!m) return null
    d = +m[1]; mo = +m[2]; y = +m[3]
  }
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const keyOf = (data, keys) => {
  if (keys.some((k) => data[k] === null || data[k] === undefined)) return null
  return keys.map((k) => String(data[k]).toLowerCase()).join('|')
}

const processRows = (rawRows, cfg) =>
  rawRows.map((raw, i) => {
    const data = {}
    const errors = []
    cfg.columns.forEach((col) => {
      let v = String(raw[col.key] ?? '').trim()
      if (col.required && !v) errors.push(`${col.key} khali hai`)
      if (v) {
        if (col.type === 'phone') {
          v = cleanPhone(v)
          if (v.length !== 10) errors.push(`${col.key} 10 digit ka nahi hai`)
        } else if (col.type === 'date') {
          const d = toIsoDate(v)
          if (d) v = d
          else errors.push(`${col.key} ki date galat hai (YYYY-MM-DD ya DD/MM/YYYY use karo)`)
        } else if (col.type === 'number') {
          const n = Number(v)
          if (Number.isNaN(n)) errors.push(`${col.key} number nahi hai`)
          else v = n
        }
        if (col.allowed) {
          const match = col.allowed.find((a) => a.toLowerCase() === String(v).toLowerCase())
          if (match) v = match
          else errors.push(`${col.key} in me se hona chahiye: ${col.allowed.join(' / ')}`)
        }
      }
      data[col.key] = v === '' ? null : v
    })
    return { line: i + 2, data, errors, duplicate: false }
  })

export default function ImportPage() {
  const [type, setType] = useState('students')
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [checking, setChecking] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [inputKey, setInputKey] = useState(0)
  const supabase = createClient()
  const cfg = TYPES[type]

  const reset = () => {
    setRows(null)
    setFileName('')
    setFileError('')
    setResult(null)
    setProgress(0)
    setInputKey((k) => k + 1)
  }

  const changeType = (t) => {
    setType(t)
    reset()
  }

  const downloadTemplate = () => {
    const header = cfg.columns.map((c) => c.key).join(',')
    const sample = cfg.columns.map((c) => c.sample).join(',')
    const blob = new Blob(['\uFEFF' + header + '\n' + sample + '\n'], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fetchExisting = async () => {
    const set = new Set()
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from(cfg.table)
        .select(cfg.uniqueKeys.join(','))
        .range(from, from + 999)
      if (error) return { set, error }
      data.forEach((r) => {
        const k = keyOf(r, cfg.uniqueKeys)
        if (k) set.add(k)
      })
      if (data.length < 1000) break
      from += 1000
    }
    return { set, error: null }
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    setResult(null)
    setRows(null)
    setFileName(file.name)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Sirf .csv file chalegi. Excel me File → Save As → "CSV UTF-8" chuno.')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, '_'),
      complete: async (res) => {
        const fields = res.meta.fields || []
        const missing = cfg.columns
          .filter((c) => c.required && !fields.includes(c.key))
          .map((c) => c.key)
        if (missing.length > 0) {
          setFileError(
            `Ye columns file me nahi mile: ${missing.join(', ')}. Template download karke wahi headings use karo.`
          )
          return
        }
        if (res.data.length === 0) {
          setFileError('File me koi data nahi mila.')
          return
        }
        if (res.data.length > 5000) {
          setFileError('Ek baar me maximum 5000 rows. File ko do hisson me baant do.')
          return
        }

        setChecking(true)
        const processed = processRows(res.data, cfg)
        const { set, error } = await fetchExisting()
        if (error) {
          setFileError('Purana data check nahi ho paya: ' + error.message)
          setChecking(false)
          return
        }
        processed.forEach((r) => {
          if (r.errors.length > 0) return
          const k = keyOf(r.data, cfg.uniqueKeys)
          if (!k) return
          if (set.has(k)) r.duplicate = true
          else set.add(k)
        })
        setRows(processed)
        setChecking(false)
      },
      error: (err) => setFileError(err.message),
    })
  }

  const doImport = async () => {
    const valid = rows.filter((r) => r.errors.length === 0 && !r.duplicate)
    const dup = rows.filter((r) => r.duplicate).length
    const bad = rows.filter((r) => r.errors.length > 0).length
    setImporting(true)
    setProgress(0)
    let inserted = 0
    let failed = 0
    let firstError = ''

    for (let i = 0; i < valid.length; i += 200) {
      const batch = valid.slice(i, i + 200).map((r) => r.data)
      const { error } = await supabase.from(cfg.table).insert(batch)
      if (error) {
        failed += batch.length
        if (!firstError) firstError = error.message
      } else {
        inserted += batch.length
      }
      setProgress(Math.min(i + 200, valid.length))
    }

    setResult({ inserted, failed, firstError, dup, bad })
    setRows(null)
    setFileName('')
    setInputKey((k) => k + 1)
    setImporting(false)
  }

  const validCount = rows ? rows.filter((r) => r.errors.length === 0 && !r.duplicate).length : 0
  const dupCount = rows ? rows.filter((r) => r.duplicate).length : 0
  const badRows = rows ? rows.filter((r) => r.errors.length > 0) : []

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">📥 Bulk Import</h1>
        <p className="text-gray-500 text-sm mb-6">
          Excel/CSV file se ek saath bahut saara data add karo.
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(TYPES).map(([k, t]) => (
            <button
              key={k}
              onClick={() => changeType(k)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                type === k
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
          <h2 className="font-bold text-gray-800 mb-1">{cfg.label} import</h2>
          <p className="text-sm text-gray-500 mb-4">{cfg.note}</p>

          <ol className="text-sm text-gray-700 space-y-1 mb-4 list-decimal list-inside">
            <li>Template download karo aur usme data bharo (headings mat badalna).</li>
            <li>Excel me File → Save As → <strong>CSV UTF-8</strong> chuno.</li>
            <li>Neeche file upload karo, preview check karo, phir Import dabao.</li>
          </ol>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
            <strong>Columns:</strong>{' '}
            {cfg.columns.map((c) => (c.required ? `${c.key}*` : c.key)).join(', ')}
            <span className="text-gray-400"> (* = zaroori)</span>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={downloadTemplate}
              className="bg-white text-indigo-600 border-2 border-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition"
            >
              ⬇️ Template Download
            </button>
            <input
              key={inputKey}
              type="file"
              accept=".csv"
              onChange={handleFile}
              disabled={importing || checking}
              className="text-sm text-gray-700"
            />
          </div>
        </div>

        {checking && <p className="text-gray-500 mb-4">File check ho rahi hai...</p>}

        {fileError && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">
            {fileError}
          </p>
        )}

        {rows && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
            <h2 className="font-bold text-gray-800 mb-1">Preview: {fileName}</h2>
            <div className="flex flex-wrap gap-3 my-4 text-sm">
              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">Total: {rows.length}</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">✅ Sahi: {validCount}</span>
              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">♻️ Duplicate (skip): {dupCount}</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">❌ Galat (skip): {badRows.length}</span>
            </div>

            {badRows.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  Galat rows (file me ye theek karke dobara upload kar sakte ho):
                </p>
                {badRows.slice(0, 30).map((r) => (
                  <p key={r.line} className="text-xs text-red-700">
                    Row {r.line}: {r.errors.join(', ')}
                  </p>
                ))}
                {badRows.length > 30 && (
                  <p className="text-xs text-red-500 mt-1">...aur {badRows.length - 30} rows</p>
                )}
              </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
              <table className="w-full text-left text-xs text-gray-900">
                <thead className="bg-indigo-50 text-indigo-800">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Status</th>
                    {cfg.columns.map((c) => (
                      <th key={c.key} className="p-2">{c.key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r) => (
                    <tr key={r.line} className="border-t border-gray-100">
                      <td className="p-2">{r.line}</td>
                      <td className="p-2">
                        {r.errors.length > 0 ? '❌' : r.duplicate ? '♻️' : '✅'}
                      </td>
                      {cfg.columns.map((c) => (
                        <td key={c.key} className="p-2">{r.data[c.key] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 10 && (
              <p className="text-xs text-gray-400 mb-4">Pehli 10 rows dikhayi gayi hain.</p>
            )}

            <div className="flex gap-3 items-center">
              <button
                onClick={doImport}
                disabled={importing || validCount === 0}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {importing ? `Import ho raha hai... ${progress}/${validCount}` : `Import ${validCount} rows`}
              </button>
              <button
                onClick={reset}
                disabled={importing}
                className="text-gray-600 hover:underline text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="font-bold text-gray-800 mb-3">Import complete</h2>
            <p className="text-green-700 text-sm">✅ {result.inserted} rows add ho gayi</p>
            {result.dup > 0 && (
              <p className="text-yellow-700 text-sm">♻️ {result.dup} duplicate skip hui</p>
            )}
            {result.bad > 0 && (
              <p className="text-red-700 text-sm">❌ {result.bad} galat rows skip hui</p>
            )}
            {result.failed > 0 && (
              <p className="text-red-700 text-sm mt-1">
                ⚠️ {result.failed} rows database error ki wajah se add nahi hui: {result.firstError}
              </p>
            )}
            <button
              onClick={reset}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Aur data import karo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
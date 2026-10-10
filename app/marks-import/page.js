'use client'
import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabaseClient'
import { fetchAll } from '@/lib/fetchAll'

const norm = (v) => String(v ?? '').trim().toLowerCase()
const canon = (h) =>
  String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })

const ID_COLS = {
  admission: ['admission_no', 'admission_number', 'adm_no', 'admno', 'admission'],
  cls: ['class'],
  section: ['section', 'sec'],
  roll: ['roll_number', 'roll_no', 'roll', 'rollno'],
  name: ['name', 'student_name', 'student'],
}
const SKIP_COLS = [
  'total', 'grand_total', 'percentage', 'percent', 'rank', 'result', 'grade',
  'remarks', 'remark', 'sr_no', 's_no', 'sno', 'sl_no', 'serial_no', 'division',
  'cgpa', 'gender', 'father_name', 'mother_name',
]
const ABSENT = /^(ab|abs|absent|a|na|n\/a|-|—)$/i

const detect = (fields) => {
  const found = {}
  const subjects = []
  fields.forEach((f) => {
    const c = canon(f)
    if (!c) return
    let isId = false
    Object.keys(ID_COLS).forEach((k) => {
      if (ID_COLS[k].includes(c)) {
        if (!found[k]) found[k] = f
        isId = true
      }
    })
    if (isId) return
    subjects.push({ key: f, name: f.trim(), include: !SKIP_COLS.includes(c), max: '100' })
  })
  return { found, subjects }
}

const matchRow = (raw, found, students, byAdm) => {
  const adm = found.admission ? norm(raw[found.admission]) : ''
  if (adm) {
    const m = byAdm[adm] || []
    if (m.length === 1) return { student: m[0] }
    if (m.length === 0) return { error: `Admission No "${raw[found.admission]}" system me nahi mila` }
    return { error: `Admission No "${raw[found.admission]}" ek se zyada students ka hai` }
  }
  if (found.cls && found.roll) {
    const c = norm(raw[found.cls])
    const r = norm(raw[found.roll])
    if (c && r) {
      const sec = found.section ? norm(raw[found.section]) : ''
      const m = students.filter(
        (s) =>
          norm(s.class) === c &&
          norm(s.roll_number) === r &&
          (sec === '' || norm(s.section) === sec)
      )
      if (m.length === 1) return { student: m[0] }
      if (m.length === 0) return { error: `Class ${raw[found.cls]} roll ${raw[found.roll]} ka student nahi mila` }
      return { error: `Class ${raw[found.cls]} roll ${raw[found.roll]} par ek se zyada students hain (section bhi do)` }
    }
  }
  return { error: 'Student pehchana nahi ja saka (Admission No. ya Class + Roll No. chahiye)' }
}

const parseCell = (v, max) => {
  const t = String(v ?? '').trim()
  if (t === '' || ABSENT.test(t)) return { skip: true }
  const n = Number(t.replace(',', '.'))
  if (Number.isNaN(n)) return { error: `"${t}" number nahi hai` }
  if (n < 0) return { error: `${t} negative nahi ho sakta` }
  if (max > 0 && n > max) return { error: `${t} Max ${max} se zyada hai` }
  return { value: n }
}

const analyzeRows = (raws, matches, subjects) => {
  const inc = subjects.filter((s) => s.include)
  const seen = {}
  return raws.map((raw, i) => {
    const line = i + 2
    const m = matches[i]
    if (m.error) return { idx: i, line, status: 'nomatch', errors: [m.error] }
    const st = m.student
    const errors = []
    const values = {}
    inc.forEach((sub) => {
      const p = parseCell(raw[sub.key], Number(sub.max))
      if (p.error) errors.push(`${sub.name}: ${p.error}`)
      else if (!p.skip) values[sub.key] = p.value
    })
    if (seen[st.id]) errors.push(`Ye bachcha file me dobara aaya hai (pehle row ${seen[st.id]} me)`)
    else seen[st.id] = line
    if (errors.length) return { idx: i, line, status: 'bad', student: st, errors }
    if (Object.keys(values).length === 0) return { idx: i, line, status: 'empty', student: st, errors: [] }
    return { idx: i, line, status: 'ok', student: st, values, errors: [] }
  })
}

export default function MarksImportPage() {
  const [students, setStudents] = useState([])
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [examName, setExamName] = useState('')
  const [examList, setExamList] = useState([])

  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [raws, setRaws] = useState(null)
  const [matches, setMatches] = useState([])
  const [found, setFound] = useState({})
  const [subjects, setSubjects] = useState([])
  const [bulkMax, setBulkMax] = useState('100')
  const [inputKey, setInputKey] = useState(0)

  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const st = await fetchAll(() =>
          supabase.from('students').select('id, name, class, section, roll_number, admission_no')
        )
        setStudents(st)
      } catch (e) {
        setError(e.message || 'Students load nahi hue')
      }
      setStudentsLoaded(true)
      try {
        const rows = await fetchAll(() => supabase.from('marks').select('id, exam_name'))
        const seen = {}
        rows.forEach((r) => {
          const k = norm(r.exam_name)
          if (k && !seen[k]) seen[k] = String(r.exam_name).trim()
        })
        setExamList(Object.values(seen).sort(natural))
      } catch (e) {
        // exam list na mile to bhi page chalega
      }
    }
    init()
  }, [])

  const resetFile = () => {
    setFileName('')
    setFileError('')
    setRaws(null)
    setMatches([])
    setFound({})
    setSubjects([])
    setInputKey((k) => k + 1)
  }

  const downloadTemplate = () => {
    const header = 'admission_no,name,Hindi,English,Maths,Science,Social Science'
    const sample = 'ADM-2026-0001,Rahul Sharma,78,82,91,85,88'
    const blob = new Blob(['\uFEFF' + header + '\n' + sample + '\n'], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'marks_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setError('')
    setFileError('')
    setRaws(null)
    setFileName(file.name)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Sirf .csv file chalegi. Excel me File → Save As → "CSV UTF-8" chuno.')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: (res) => {
        const fields = (res.meta.fields || []).filter(Boolean)
        const canons = fields.map(canon).filter(Boolean)
        if (new Set(canons).size !== canons.length) {
          setFileError('File me do column ka naam ek jaisa hai. Naam alag-alag karke dobara try karo.')
          return
        }
        const { found: f, subjects: subs } = detect(fields)
        if (!f.admission && !(f.cls && f.roll)) {
          setFileError(
            'Bachcha pehchanne ke liye "admission_no" column chahiye, ya "class" aur "roll_number" dono. Template download karke dekho.'
          )
          return
        }
        if (subs.length === 0) {
          setFileError('Koi subject column nahi mila.')
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

        const byAdm = {}
        students.forEach((s) => {
          const k = norm(s.admission_no)
          if (!k) return
          if (!byAdm[k]) byAdm[k] = []
          byAdm[k].push(s)
        })
        setMatches(res.data.map((r) => matchRow(r, f, students, byAdm)))
        setFound(f)
        setSubjects(subs)
        setRaws(res.data)
      },
      error: (err) => setFileError(err.message),
    })
  }

  const toggleSubject = (key) =>
    setSubjects((prev) => prev.map((s) => (s.key === key ? { ...s, include: !s.include } : s)))
  const setMax = (key, v) =>
    setSubjects((prev) => prev.map((s) => (s.key === key ? { ...s, max: v } : s)))
  const applyBulkMax = () => setSubjects((prev) => prev.map((s) => ({ ...s, max: bulkMax })))

  const analyzed = raws ? analyzeRows(raws, matches, subjects) : []
  const okRows = analyzed.filter((r) => r.status === 'ok')
  const noMatch = analyzed.filter((r) => r.status === 'nomatch')
  const badRows = analyzed.filter((r) => r.status === 'bad')
  const emptyRows = analyzed.filter((r) => r.status === 'empty')
  const incSubs = subjects.filter((s) => s.include)
  const maxBad = incSubs.some((s) => !(Number(s.max) > 0))
  const countFor = (key) => okRows.filter((r) => r.values[key] !== undefined).length
  const problems = [...noMatch, ...badRows].sort((a, b) => a.line - b.line)
  const nameFor = (r) =>
    r.student ? r.student.name : found.name && raws ? String(raws[r.idx][found.name] || '') : ''

  const doImport = async () => {
    setError('')
    setResult(null)
    if (!examName.trim()) {
      setError('Pehle upar exam ka naam likho (jaise Half Yearly)')
      return
    }
    if (incSubs.length === 0) {
      setError('Kam se kam ek subject tick karo')
      return
    }
    if (maxBad) {
      setError('Har subject ka Max marks sahi daalo')
      return
    }

    const jobs = incSubs
      .map((sub) => ({
        sub,
        rows: okRows
          .filter((r) => r.values[sub.key] !== undefined)
          .map((r) => ({ id: r.student.id, marks: r.values[sub.key] })),
      }))
      .filter((j) => j.rows.length > 0)

    if (jobs.length === 0) {
      setError('Save karne ke liye koi sahi marks nahi mile')
      return
    }

    const total = jobs.reduce((a, j) => a + j.rows.length, 0)
    const ok = window.confirm(
      `"${examName.trim()}" ke liye ${okRows.length} bachchon ke ${jobs.length} subject (${total} marks) save honge. ` +
        `Same exam aur subject ke purane marks badal jayenge. Pakka karna hai?`
    )
    if (!ok) return

    setImporting(true)
    const done = []
    const failed = []
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      setProgress(`${job.sub.name} save ho raha hai (${i + 1}/${jobs.length})`)
      const { error } = await supabase.rpc('save_marks', {
        p_exam: examName.trim(),
        p_subject: job.sub.name,
        p_max: Number(job.sub.max),
        p_rows: job.rows,
      })
      if (error) failed.push({ name: job.sub.name, msg: error.message })
      else done.push({ name: job.sub.name, count: job.rows.length })
    }

    setResult({
      done,
      failed,
      students: okRows.length,
      skippedNoMatch: noMatch.length,
      skippedBad: badRows.length,
      skippedEmpty: emptyRows.length,
    })
    setProgress('')
    setImporting(false)
    resetFile()
    try {
      const rows = await fetchAll(() => supabase.from('marks').select('id, exam_name'))
      const seen = {}
      rows.forEach((r) => {
        const k = norm(r.exam_name)
        if (k && !seen[k]) seen[k] = String(r.exam_name).trim()
      })
      setExamList(Object.values(seen).sort(natural))
    } catch (e) {
      // ignore
    }
  }

  const inputCls =
    'border border-gray-300 text-gray-900 bg-white placeholder-gray-400 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">📥 Marks Import</h1>
        <p className="text-gray-500 text-sm mb-6">
          Excel/CSV file se poori class ya poore school ke marks ek saath daalo. Ek row = ek bachcha, har subject ka
          alag column.
        </p>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        {result && (
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-6">
            <h2 className="font-bold text-gray-800 mb-2">Import complete</h2>
            {result.done.length > 0 && (
              <p className="text-green-700 text-sm">
                ✅ {result.students} bachchon ke marks save hue:{' '}
                {result.done.map((d) => `${d.name} (${d.count})`).join(', ')}
              </p>
            )}
            {result.failed.length > 0 &&
              result.failed.map((f) => (
                <p key={f.name} className="text-red-700 text-sm mt-1">
                  ⚠️ {f.name} save nahi hua: {f.msg}. File theek karke dobara import karo, double entry nahi hogi.
                </p>
              ))}
            {result.skippedNoMatch > 0 && (
              <p className="text-orange-700 text-sm mt-1">
                ❓ {result.skippedNoMatch} rows me bachcha nahi mila, skip hui.
              </p>
            )}
            {result.skippedBad > 0 && (
              <p className="text-red-700 text-sm mt-1">❌ {result.skippedBad} rows me galat marks the, skip hui.</p>
            )}
            {result.skippedEmpty > 0 && (
              <p className="text-gray-600 text-sm mt-1">
                ⚪ {result.skippedEmpty} rows me koi marks bhare nahi the, skip hui.
              </p>
            )}
          </div>
        )}

        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exam / Test ka naam</label>
              <input
                list="exam-list"
                type="text"
                placeholder="jaise Half Yearly"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className={inputCls}
              />
              <datalist id="exam-list">
                {examList.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <button
              onClick={downloadTemplate}
              className="bg-white text-indigo-600 border-2 border-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition"
            >
              ⬇️ Template Download
            </button>
          </div>

          <ol className="text-sm text-gray-700 space-y-1 mb-4 list-decimal list-inside">
            <li>Template download karo ya apni Excel file use karo. Subject ke column ka naam wahi likho jo report me chahiye.</li>
            <li>Bachche ko pehchanne ke liye <strong>admission_no</strong> column rakho (ya <strong>class</strong> aur <strong>roll_number</strong>).</li>
            <li>Absent bachche ka cell khali chhodo ya <strong>AB</strong> likho.</li>
            <li>Excel me File → Save As → <strong>CSV UTF-8</strong>, phir neeche upload karo.</li>
          </ol>

          {!studentsLoaded ? (
            <p className="text-sm text-gray-400">Students ki list load ho rahi hai...</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-orange-700">
              System me abhi koi student nahi hai. Pehle students import ya add karo.
            </p>
          ) : (
            <input
              key={inputKey}
              type="file"
              accept=".csv"
              onChange={handleFile}
              disabled={importing}
              className="text-sm text-gray-700"
            />
          )}
        </div>

        {fileError && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm">{fileError}</p>
        )}

        {raws && (
          <>
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-800 mb-1">Subjects ({fileName})</h3>
              <p className="text-xs text-gray-500 mb-3">
                Jo column subject nahi hai use untick karo. Har subject ka Max marks daalo.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
                <span className="text-gray-700">Sabka Max ek jaisa karo:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bulkMax}
                  onChange={(e) => setBulkMax(e.target.value)}
                  className={`w-20 text-center ${inputCls}`}
                />
                <button
                  onClick={applyBulkMax}
                  className="px-3 py-1 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  Sab par lagao
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-indigo-50 text-indigo-800">
                    <tr>
                      <th className="p-2 text-left w-16">Lena hai?</th>
                      <th className="p-2 text-left">Subject</th>
                      <th className="p-2 text-left">Max marks</th>
                      <th className="p-2 text-left">Marks milenge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.key} className="border-t border-gray-100">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={s.include}
                            onChange={() => toggleSubject(s.key)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className={`p-2 ${s.include ? '' : 'text-gray-400 line-through'}`}>{s.name}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={s.max}
                            disabled={!s.include}
                            onChange={(e) => setMax(s.key, e.target.value)}
                            className={`w-20 text-center p-1 rounded border text-gray-900 ${
                              !s.include || Number(s.max) > 0 ? 'border-gray-300' : 'border-red-500'
                            }`}
                          />
                        </td>
                        <td className="p-2 text-gray-600">{s.include ? countFor(s.key) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-800 mb-3">Preview</h3>
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">Total rows: {raws.length}</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">✅ Save hongi: {okRows.length}</span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full">❓ Bachcha nahi mila: {noMatch.length}</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">❌ Galat marks: {badRows.length}</span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">⚪ Khali: {emptyRows.length}</span>
              </div>

              {problems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    In rows ko skip kiya jayega (file me theek karke dobara upload kar sakte ho):
                  </p>
                  {problems.slice(0, 30).map((r) => (
                    <p key={r.line} className="text-xs text-red-700">
                      Row {r.line}
                      {nameFor(r) ? ` (${nameFor(r)})` : ''}: {r.errors.join('; ')}
                    </p>
                  ))}
                  {problems.length > 30 && (
                    <p className="text-xs text-red-500 mt-1">...aur {problems.length - 30} rows</p>
                  )}
                </div>
              )}

              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="w-full text-left text-xs text-gray-900">
                  <thead className="bg-indigo-50 text-indigo-800">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Bachcha</th>
                      <th className="p-2">Class</th>
                      {incSubs.map((s) => (
                        <th key={s.key} className="p-2">
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyzed.slice(0, 10).map((r) => (
                      <tr key={r.line} className="border-t border-gray-100">
                        <td className="p-2">{r.line}</td>
                        <td className="p-2">
                          {r.status === 'ok' ? '✅' : r.status === 'nomatch' ? '❓' : r.status === 'bad' ? '❌' : '⚪'}
                        </td>
                        <td className="p-2">{nameFor(r) || '—'}</td>
                        <td className="p-2">
                          {r.student ? `${r.student.class} ${r.student.section || ''}` : '—'}
                        </td>
                        {incSubs.map((s) => (
                          <td key={s.key} className="p-2">
                            {String(raws[r.idx][s.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {raws.length > 10 && <p className="text-xs text-gray-400 mb-4">Pehli 10 rows dikhayi gayi hain.</p>}

              <div className="flex gap-3 items-center">
                <button
                  onClick={doImport}
                  disabled={importing || okRows.length === 0}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {importing ? progress || 'Import ho raha hai...' : `Import karo (${okRows.length} bachche)`}
                </button>
                <button
                  onClick={resetFile}
                  disabled={importing}
                  className="text-gray-600 hover:underline text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const pad = (n) => String(n).padStart(2, '0')

const cellText = (v) => {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    const d = new Date(v.getTime() + 12 * 3600 * 1000)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return String(v).trim()
}

async function readSheet(file, opts) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  if (!wb.SheetNames.length) throw new Error('File me koi sheet nahi mili')
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
  const head = aoa.findIndex((r) => r.some((c) => cellText(c) !== ''))
  if (head === -1) return { data: [], meta: { fields: [] }, errors: [] }

  const t = opts.transformHeader || ((h) => h)
  const cols = []
  aoa[head].forEach((h, i) => {
    const name = cellText(h)
    if (name) cols.push({ i, key: t(name, i) })
  })

  const data = []
  for (let r = head + 1; r < aoa.length; r++) {
    const row = aoa[r]
    if (!row.some((c) => cellText(c) !== '')) continue
    const obj = {}
    cols.forEach((c) => {
      obj[c.key] = cellText(row[c.i])
    })
    data.push(obj)
  }
  return { data, meta: { fields: cols.map((c) => c.key) }, errors: [] }
}

const compat = {
  parse(source, opts = {}) {
    const isFile = typeof File !== 'undefined' && source instanceof File
    if (isFile && /\.(xlsx|xls|ods)$/i.test(source.name)) {
      readSheet(source, opts)
        .then((res) => opts.complete && opts.complete(res))
        .catch((err) => opts.error && opts.error(err))
      return
    }
    const tsv = isFile && /\.tsv$/i.test(source.name)
    return Papa.parse(source, {
      header: true,
      skipEmptyLines: true,
      ...(tsv ? { delimiter: '\t' } : {}),
      ...opts,
    })
  },
}

export default compat
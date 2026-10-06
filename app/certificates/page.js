'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function CertificatesPage() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentInfo, setStudentInfo] = useState(null)
  const [certType, setCertType] = useState('Bonafide')
  const [purpose, setPurpose] = useState('')
  const supabase = createClient()

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name')
    if (data) setStudents(data)
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleGenerate = (e) => {
    e.preventDefault()
    const student = students.find((s) => s.id.toString() === selectedStudent)
    setStudentInfo(student)
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📜 Certificates</h1>

        <form
          onSubmit={handleGenerate}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 gap-4 print:hidden"
        >
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
            required
          >
            <option value="">Student select karo</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.class} {s.section})
              </option>
            ))}
          </select>

          <select
            value={certType}
            onChange={(e) => setCertType(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
          >
            <option value="Bonafide">Bonafide Certificate</option>
            <option value="Transfer">Transfer Certificate</option>
            <option value="Character">Character Certificate</option>
          </select>

          <input
            type="text"
            placeholder="Purpose (e.g. Passport application, Bank account)"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />

          <button
            type="submit"
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Generate Certificate
          </button>
        </form>

        {studentInfo && (
          <div className="bg-white p-10 rounded-xl shadow-md border border-gray-200 print:shadow-none print:border-0">
            <div className="text-center border-b-2 border-indigo-700 pb-4 mb-8">
              <div className="text-4xl mb-2">🏫</div>
              <h2 className="text-2xl font-bold text-gray-800">ABC Public School</h2>
              <p className="text-sm text-gray-500">123, School Road, Your City</p>
            </div>

            <h3 className="text-xl font-bold text-center uppercase tracking-wide text-indigo-700 mb-8">
              {certType} Certificate
            </h3>

            <p className="text-gray-800 leading-relaxed text-justify">
              This is to certify that <strong>{studentInfo.name}</strong>
              {studentInfo.father_name && <> S/o or D/o <strong>{studentInfo.father_name}</strong></>}
              {' '}is a bonafide student of this school, studying in{' '}
              <strong>Class {studentInfo.class} {studentInfo.section}</strong>
              {studentInfo.admission_no && <> with Admission No. <strong>{studentInfo.admission_no}</strong></>}.
              {certType === 'Bonafide' &&
                ' As per our school records, his/her conduct and character are satisfactory.'}
              {certType === 'Transfer' &&
                ' He/She is relieved from this institution and is eligible to seek admission elsewhere.'}
              {certType === 'Character' &&
                ' His/her conduct and character during the period of study have been found to be good.'}
              {purpose && <> This certificate is being issued for the purpose of <strong>{purpose}</strong>.</>}
            </p>

            <div className="mt-16 flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-500">Date: {today}</p>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-400 w-40 mb-1"></div>
                <p className="text-sm text-gray-600">Principal's Signature</p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="mt-10 w-full bg-gray-700 text-white p-2 rounded-lg font-semibold hover:bg-gray-800 transition print:hidden"
            >
              🖨️ Print Certificate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
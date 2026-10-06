'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState([])
  const [studentName, setStudentName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [contact, setContact] = useState('')
  const [apaarId, setApaarId] = useState('')
  const [parentPan, setParentPan] = useState('')
  const [admissionNo, setAdmissionNo] = useState('')
  const [applyingClass, setApplyingClass] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [expectedFee, setExpectedFee] = useState(null)
  const supabase = createClient()

  const checkFee = async (cls, cat) => {
    if (!cls || !cat) {
      setExpectedFee(null)
      return
    }
    const { data } = await supabase
      .from('fee_structure')
      .select('amount')
      .eq('class', cls)
      .eq('category', cat)
      .maybeSingle()

    setExpectedFee(data ? data.amount : 'not_set')
  }

  const fetchAdmissions = async () => {
    const { data, error } = await supabase
      .from('admissions')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setAdmissions(data)
    }
  }

  useEffect(() => {
    fetchAdmissions()
  }, [])

  const handleAddEnquiry = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('admissions').insert([
      {
        student_name: studentName,
        father_name: fatherName,
        mother_name: motherName,
        contact: contact,
        apaar_id: apaarId,
        parent_pan: parentPan,
        admission_no: admissionNo,
        applying_for_class: applyingClass,
        category: category,
        status: 'New',
        notes: notes,
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setStudentName('')
      setFatherName('')
      setMotherName('')
      setContact('')
      setApaarId('')
      setParentPan('')
      setAdmissionNo('')
      setApplyingClass('')
      setCategory('')
      setNotes('')
      setExpectedFee(null)
      fetchAdmissions()
    }
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('admissions').update({ status }).eq('id', id)
    if (!error) fetchAdmissions()
  }

  const handleAdmit = async (admission) => {
    setError('')
    setMessage('')

    const { data: newStudent, error: studentError } = await supabase
      .from('students')
      .insert([
        {
          name: admission.student_name,
          class: admission.applying_for_class,
          section: '',
          roll_number: '',
          parent_contact: admission.contact,
          father_name: admission.father_name,
          mother_name: admission.mother_name,
          apaar_id: admission.apaar_id,
          parent_pan: admission.parent_pan,
          admission_no: admission.admission_no,
          category: admission.category,
        },
      ])
      .select()
      .single()

    if (studentError) {
      setError(studentError.message)
      return
    }

    const { data: feeStructureMatch } = await supabase
      .from('fee_structure')
      .select('*')
      .eq('class', admission.applying_for_class)
      .eq('category', admission.category)
      .maybeSingle()

    if (feeStructureMatch) {
      await supabase.from('fees').insert([
        {
          'student-id': newStudent.id,
          amount: feeStructureMatch.amount,
          paid_amount: 0,
          due_date: new Date().toISOString().split('T')[0],
          status: feeStructureMatch.amount > 0 ? 'Unpaid' : 'Paid',
        },
      ])
    }

    const { error: updateError } = await supabase
      .from('admissions')
      .update({ status: 'Admitted' })
      .eq('id', admission.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage(
        feeStructureMatch
          ? `${admission.student_name} admit ho gaya! Fee automatically set hui: ₹${feeStructureMatch.amount}`
          : `${admission.student_name} admit ho gaya! (Is class/category ke liye fee structure set nahi hai, fees manually add karo)`
      )
      fetchAdmissions()
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('admissions').delete().eq('id', id)
    if (!error) fetchAdmissions()
  }

  const statusColor = (status) => {
    if (status === 'New') return 'bg-blue-100 text-blue-700'
    if (status === 'Contacted') return 'bg-yellow-100 text-yellow-700'
    if (status === 'Visited') return 'bg-purple-100 text-purple-700'
    if (status === 'Admitted') return 'bg-green-100 text-green-700'
    if (status === 'Lost') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📋 Admissions & Enquiry</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}
        {message && (
          <p className="bg-green-50 text-green-700 border border-green-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {message}
          </p>
        )}

        <form
          onSubmit={handleAddEnquiry}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <input
            type="text"
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Father Name"
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Mother Name"
            value={motherName}
            onChange={(e) => setMotherName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="APAAR ID (optional)"
            value={apaarId}
            onChange={(e) => setApaarId(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Parent PAN (optional)"
            value={parentPan}
            onChange={(e) => setParentPan(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Admission No."
            value={admissionNo}
            onChange={(e) => setAdmissionNo(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Applying for Class (e.g. 5)"
            value={applyingClass}
            onChange={(e) => {
              setApplyingClass(e.target.value)
              checkFee(e.target.value, category)
            }}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              checkFee(applyingClass, e.target.value)
            }}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
            required
          >
            <option value="">Category</option>
            <option value="RTE">RTE</option>
            <option value="Self-Finance">Self-Finance</option>
            <option value="General">General</option>
            <option value="EWS">EWS</option>
          </select>

          {expectedFee !== null && (
            <div className="md:col-span-3 bg-indigo-50 text-indigo-700 p-3 rounded-lg text-sm font-medium">
              {expectedFee === 'not_set'
                ? '⚠️ Is Class/Category ke liye fee structure set nahi hai. Pehle Fee Structure page se set karo.'
                : `💰 Is admission ki expected fee: ₹${expectedFee}`}
            </div>
          )}

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400 md:col-span-3"
            rows="2"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-3 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Enquiry'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
          <table className="w-full text-left text-gray-900 text-sm">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Father</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Class</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((a) => (
                <tr key={a.id} className="border-t border-gray-200">
                  <td className="p-3">{a.student_name}</td>
                  <td className="p-3">{a.father_name}</td>
                  <td className="p-3">{a.contact}</td>
                  <td className="p-3">{a.applying_for_class}</td>
                  <td className="p-3">{a.category}</td>
                  <td className="p-3">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusColor(a.status)}`}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Visited">Visited</option>
                      <option value="Admitted">Admitted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </td>
                  <td className="p-3 flex gap-3">
                    {a.status !== 'Admitted' && (
                      <button
                        onClick={() => handleAdmit(a)}
                        className="text-green-600 hover:underline text-sm font-medium"
                      >
                        Admit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-400">
                    Koi enquiry nahi hai abhi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
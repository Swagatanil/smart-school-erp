'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function TransportPage() {
  const [routes, setRoutes] = useState([])
  const [routeName, setRouteName] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverContact, setDriverContact] = useState('')
  const [capacity, setCapacity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const supabase = createClient()

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from('transport')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setRoutes(data)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  const resetForm = () => {
    setRouteName('')
    setVehicleNo('')
    setDriverName('')
    setDriverContact('')
    setCapacity('')
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      route_name: routeName,
      vehicle_no: vehicleNo,
      driver_name: driverName,
      driver_contact: driverContact,
      capacity: parseInt(capacity) || null,
    }

    if (editingId) {
      const { error } = await supabase.from('transport').update(payload).eq('id', editingId)
      if (error) setError(error.message)
      else {
        resetForm()
        fetchRoutes()
      }
    } else {
      const { error } = await supabase.from('transport').insert([payload])
      if (error) setError(error.message)
      else {
        resetForm()
        fetchRoutes()
      }
    }
    setLoading(false)
  }

  const handleEdit = (r) => {
    setEditingId(r.id)
    setRouteName(r.route_name || '')
    setVehicleNo(r.vehicle_no || '')
    setDriverName(r.driver_name || '')
    setDriverContact(r.driver_contact || '')
    setCapacity(r.capacity || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('transport').delete().eq('id', id)
    if (!error) fetchRoutes()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">🚌 Transport</h1>

        {error && (
          <p className="bg-red-50 text-red-700 border border-red-300 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {editingId && (
            <div className="md:col-span-2 bg-yellow-50 text-yellow-800 p-2 rounded-lg text-sm font-medium flex justify-between items-center">
              ✏️ Editing: {routeName}
              <button type="button" onClick={resetForm} className="text-yellow-900 underline text-xs">
                Cancel
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Route Name (e.g. Route 1 - North)"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Vehicle Number"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Driver Contact"
            value={driverContact}
            onChange={(e) => setDriverContact(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <input
            type="number"
            placeholder="Capacity (seats)"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update Route' : 'Add Route'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Route</th>
                <th className="p-3">Vehicle No</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Capacity</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-t border-gray-200">
                  <td className="p-3">{r.route_name}</td>
                  <td className="p-3">{r.vehicle_no}</td>
                  <td className="p-3">{r.driver_name}</td>
                  <td className="p-3">{r.driver_contact}</td>
                  <td className="p-3">{r.capacity}</td>
                  <td className="p-3 flex gap-3">
                    <button onClick={() => handleEdit(r)} className="text-indigo-600 hover:underline text-sm font-medium">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-sm font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-400">
                    Koi route add nahi hua abhi
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
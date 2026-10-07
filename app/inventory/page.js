'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const supabase = createClient()

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setItems(data)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const resetForm = () => {
    setItemName('')
    setCategory('')
    setQuantity('')
    setUnit('')
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      item_name: itemName,
      category,
      quantity: parseInt(quantity) || 0,
      unit,
      last_updated: new Date().toISOString().split('T')[0],
    }

    if (editingId) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingId)
      if (error) setError(error.message)
      else {
        resetForm()
        fetchItems()
      }
    } else {
      const { error } = await supabase.from('inventory').insert([payload])
      if (error) setError(error.message)
      else {
        resetForm()
        fetchItems()
      }
    }
    setLoading(false)
  }

  const handleEdit = (i) => {
    setEditingId(i.id)
    setItemName(i.item_name || '')
    setCategory(i.category || '')
    setQuantity(i.quantity || '')
    setUnit(i.unit || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (!error) fetchItems()
  }

  const lowStock = (qty) => qty !== null && qty < 10

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-indigo-700 mb-6">📦 Inventory</h1>

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
              ✏️ Editing: {itemName}
              <button type="button" onClick={resetForm} className="text-yellow-900 underline text-xs">
                Cancel
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Item Name (e.g. Chalk Box)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 bg-white"
          >
            <option value="">Category</option>
            <option value="Stationery">Stationery</option>
            <option value="Furniture">Furniture</option>
            <option value="Sports">Sports</option>
            <option value="Lab Equipment">Lab Equipment</option>
            <option value="Electronics">Electronics</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
            required
          />
          <input
            type="text"
            placeholder="Unit (e.g. pcs, boxes, kg)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg font-semibold hover:bg-indigo-700 transition md:col-span-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update Item' : 'Add Item'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-gray-900">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Category</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Last Updated</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-200">
                  <td className="p-3">{i.item_name}</td>
                  <td className="p-3">{i.category}</td>
                  <td className="p-3">
                    <span className={lowStock(i.quantity) ? 'text-red-600 font-bold' : ''}>
                      {i.quantity}
                    </span>
                    {lowStock(i.quantity) && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Low Stock
                      </span>
                    )}
                  </td>
                  <td className="p-3">{i.unit}</td>
                  <td className="p-3">{i.last_updated}</td>
                  <td className="p-3 flex gap-3">
                    <button onClick={() => handleEdit(i)} className="text-indigo-600 hover:underline text-sm font-medium">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(i.id)} className="text-red-600 hover:underline text-sm font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-400">
                    Koi item add nahi hua abhi
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
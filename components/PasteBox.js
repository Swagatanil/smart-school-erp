'use client'
import { useState } from 'react'

export default function PasteBox({ onText, disabled }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  return (
    <div className="w-full mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm text-indigo-600 hover:underline"
      >
        {open ? 'Paste box band karo' : 'Ya Excel / Google Sheet se cells copy karke yahan paste karo'}
      </button>
      {open && (
        <div className="mt-2">
          <textarea
            rows="6"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Sheet me header wali row samet saare cells select karo, Ctrl+C karo, aur yahan Ctrl+V karo"
            className="w-full border border-gray-300 text-gray-900 bg-white placeholder-gray-400 p-2 rounded-lg text-sm"
          />
          <button
            type="button"
            disabled={disabled || !text.trim()}
            onClick={() => onText(text)}
            className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Is data ko check karo
          </button>
        </div>
      )}
    </div>
  )
}
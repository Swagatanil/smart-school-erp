'use client'

export default function ClassPicker({ classes, onPick, title, hint }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-lg font-bold text-gray-800 mb-1">{title}</h2>
      {hint && <p className="text-sm text-gray-500 mb-4">{hint}</p>}
      {classes.length === 0 ? (
        <p className="text-gray-400 text-sm">Abhi koi student add nahi hua hai.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="px-5 py-3 rounded-lg border-2 border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition"
            >
              Class {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
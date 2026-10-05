import Link from 'next/link'

export default function Home() {
  const upcomingFeatures = [
    'Library Management (book issue/return)',
    'Homework & Assignments',
    'Digital Certificates (bonafide, transfer)',
    'Online Fee Payment',
    'SMS/WhatsApp Notifications',
    'Parent Login Portal',
    'Role-based Access (Admin/Teacher/Parent)',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-10 text-center">
        <div className="text-5xl mb-4">🏫</div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Welcome to Smart School ERP
        </h1>
        <p className="text-gray-500 mb-8">
          Ek complete school management system — students, attendance, fees, exams aur bahut kuch, sab ek jagah.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link
            href="/login"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-white text-indigo-600 border-2 border-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Signup
          </Link>
        </div>

        <div className="text-left bg-indigo-50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-indigo-800 mb-3">🚀 Jald aane wale features</h2>
          <ul className="space-y-2">
            {upcomingFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-gray-700 text-sm">
                <span className="text-indigo-500">●</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
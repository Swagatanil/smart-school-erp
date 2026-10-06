'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/admissions', label: 'Admissions' },
    { href: '/students', label: 'Students' },
    { href: '/attendance', label: 'Attendance' },
    { href: '/fees', label: 'Fees' },
    { href: '/marks', label: 'Marks' },
    { href: '/report-card', label: 'Report Card' },
    { href: '/notices', label: 'Notices' },
    { href: '/timetable', label: 'Timetable' },
    { href: '/staff', label: 'Staff' },
    { href: '/fee-structure', label: 'Fee Structure' },
    { href: '/certificates', label: 'Certificates' },
  ]

  return(
    <nav className="bg-indigo-700 text-white shadow-md relative z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🏫</span>
            <span>ABC Public School</span>
          </Link>

          <div className="hidden md:flex gap-4 text-sm flex-wrap items-center">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-indigo-200 transition whitespace-nowrap">
                {link.label}
              </Link>
            ))}
          </div>

          <button
            className="md:hidden text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden flex flex-col gap-3 pb-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-indigo-200 transition"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
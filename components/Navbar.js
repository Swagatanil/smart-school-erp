'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [role, setRole] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('staff')
        .select('role')
        .eq('email', user.email)
        .maybeSingle()

      setRole(data ? data.role : 'Unknown')
    }

    fetchRole()
  }, [])

  const adminRoles = ['Principal', 'Admin Staff']
  const accountantRoles = ['Accountant']

  const allLinks = [
    { href: '/dashboard', label: 'Dashboard', access: 'all' },
    { href: '/admissions', label: 'Admissions', access: 'admin-accountant' },
    { href: '/students', label: 'Students', access: 'all' },
    { href: '/attendance', label: 'Attendance', access: 'all' },
    { href: '/fees', label: 'Fees', access: 'admin-accountant' },
    { href: '/marks', label: 'Marks', access: 'all' },
    { href: '/report-card', label: 'Report Card', access: 'all' },
    { href: '/notices', label: 'Notices', access: 'all' },
    { href: '/timetable', label: 'Timetable', access: 'all' },
    { href: '/staff', label: 'Staff', access: 'admin' },
    { href: '/fee-structure', label: 'Fee Structure', access: 'admin-accountant' },
    { href: '/certificates', label: 'Certificates', access: 'admin' },
    { href: '/transport', label: 'Transport', access: 'all' },
    { href: '/inventory', label: 'Inventory', access: 'all' },
  ]

  const canSee = (access) => {
    if (access === 'all') return true
    if (access === 'admin') return adminRoles.includes(role)
    if (access === 'admin-accountant')
      return adminRoles.includes(role) || accountantRoles.includes(role)
    return false
  }

  const links = allLinks.filter((link) => canSee(link.access))

  return (
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

          <button className="md:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
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
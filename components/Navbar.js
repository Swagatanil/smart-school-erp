'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [role, setRole] = useState(null)
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsStaffLoggedIn(true)
      const { data } = await supabase
        .from('staff')
        .select('role')
        .ilike('email', user.email)
        .maybeSingle()
      setRole(data ? data.role : 'Unknown')
    } else {
      setIsStaffLoggedIn(false)
      setRole(null)
    }
    setIsParent(!!localStorage.getItem('parentMobile'))
  }

  useEffect(() => {
    loadUser()
  }, [pathname])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('parentMobile')
    setIsStaffLoggedIn(false)
    setIsParent(false)
    setRole(null)
    setMenuOpen(false)
    router.push('/')
  }

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

  let links = []
  if (isStaffLoggedIn) {
    links = allLinks.filter((link) => canSee(link.access))
  } else if (isParent) {
    links = [{ href: '/parent-dashboard', label: 'My Child' }]
  }

  const loggedIn = isStaffLoggedIn || isParent
  const homeHref = isStaffLoggedIn ? '/dashboard' : isParent ? '/parent-dashboard' : '/'

  return (
    <nav className="bg-indigo-700 text-white shadow-md relative z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={homeHref} className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🏫</span>
            <span>ABC Public School</span>
          </Link>

          <div className="hidden md:flex gap-4 text-sm flex-wrap items-center">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-indigo-200 transition whitespace-nowrap">
                {link.label}
              </Link>
            ))}
            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-white text-indigo-700 px-3 py-1 rounded-lg font-semibold hover:bg-indigo-50 transition"
              >
                Logout
              </button>
            ) : (
              <>
                <Link href="/login" className="hover:text-indigo-200 transition whitespace-nowrap">
                  Staff Login
                </Link>
                <Link
                  href="/parent-login"
                  className="bg-white text-indigo-700 px-3 py-1 rounded-lg font-semibold hover:bg-indigo-50 transition whitespace-nowrap"
                >
                  Parent Login
                </Link>
              </>
            )}
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
            {loggedIn ? (
              <button onClick={handleLogout} className="text-left font-semibold">
                Logout
              </button>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}>Staff Login</Link>
                <Link href="/parent-login" onClick={() => setMenuOpen(false)} className="font-semibold">
                  Parent Login
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

const ADMIN = ['Principal', 'Admin Staff']
const ACCOUNTANT = ['Accountant']

const GROUPS = [
  {
    label: 'Students',
    items: [
      { href: '/admissions', label: 'Admissions', access: 'admin-accountant' },
      { href: '/students', label: 'Students', access: 'all' },
      { href: '/roll-numbers', label: 'Roll Numbers', access: 'admin' },
      { href: '/import', label: 'Bulk Import', access: 'admin' },
      { href: '/certificates', label: 'Certificates', access: 'admin' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { href: '/attendance', label: 'Attendance', access: 'all' },
      { href: '/attendance-report', label: 'Attendance Report', access: 'all' },
      { href: '/marks-entry', label: 'Marks Entry', access: 'all' },
      { href: '/marks', label: 'Marks (ek-ek)', access: 'all' },
      { href: '/marks-import', label: 'Marks Import', access: 'admin' },
      { href: '/report-card', label: 'Report Card', access: 'all' },
      { href: '/class-results', label: 'Class Results', access: 'all' },
      { href: '/timetable', label: 'Timetable', access: 'all' },
    ],
  },
  {
    label: 'Fees',
    items: [
      { href: '/fees', label: 'Fees', access: 'admin-accountant' },
      { href: '/fee-structure', label: 'Fee Structure', access: 'admin-accountant' },
      { href: '/fee-generate', label: 'Fee Generate', access: 'admin-accountant' },
      { href: '/fee-collect', label: 'Fee Collect', access: 'admin-accountant' },
      { href: '/fees-report', label: 'Fees Report', access: 'admin-accountant' },
    ],
  },
  {
    label: 'Staff',
    items: [
      { href: '/staff', label: 'Staff', access: 'admin' },
      { href: '/staff-attendance', label: 'Staff Attendance', access: 'admin' },
      { href: '/teacher-classes', label: 'Teacher Classes', access: 'admin' },
      { href: '/approvals', label: 'Approvals', access: 'admin' },
    ],
  },
  {
    label: 'School',
    items: [
      { href: '/notices', label: 'Notices', access: 'all' },
      { href: '/transport', label: 'Transport', access: 'all' },
      { href: '/inventory', label: 'Inventory', access: 'all' },
      { href: '/whatsapp', label: 'WhatsApp', access: 'all' },
    ],
  },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState(null)
  const [openMobile, setOpenMobile] = useState(null)
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const navRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsStaffLoggedIn(true)
      const { data } = await supabase
        .from('staff')
        .select('role, name')
        .ilike('email', user.email)
        .maybeSingle()
      setRole(data ? data.role : 'Unknown')
      setName(data ? data.name : '')
    } else {
      setIsStaffLoggedIn(false)
      setRole(null)
      setName('')
    }
    setIsParent(!!localStorage.getItem('parentMobile'))
  }

  useEffect(() => {
    loadUser()
    setMenuOpen(false)
    setOpenGroup(null)
  }, [pathname])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('parentMobile')
    setIsStaffLoggedIn(false)
    setIsParent(false)
    setRole(null)
    setName('')
    setMenuOpen(false)
    setOpenGroup(null)
    router.push('/')
  }

  const canSee = (access) => {
    if (access === 'all') return true
    if (access === 'admin') return ADMIN.includes(role)
    if (access === 'admin-accountant') return ADMIN.includes(role) || ACCOUNTANT.includes(role)
    return false
  }

  const showMenu = isStaffLoggedIn && role && role !== 'Unknown'
  const groups = showMenu
    ? GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i.access)) })).filter(
        (g) => g.items.length > 0
      )
    : []
  const loggedIn = isStaffLoggedIn || isParent
  const parentOnly = isParent && !isStaffLoggedIn
  const homeHref = isStaffLoggedIn ? '/dashboard' : isParent ? '/parent-dashboard' : '/'

  return (
    <nav ref={navRef} className="bg-indigo-700 text-white shadow-md relative z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link href={homeHref} className="flex items-center gap-2 font-bold text-lg min-w-0">
            <span className="text-2xl">🏫</span>
            <span className="truncate">ABC Public School</span>
          </Link>

          {/* Laptop menu */}
          <div className="hidden lg:flex items-center gap-1 text-sm">
            {showMenu && (
              <Link href="/dashboard" className="px-3 py-2 rounded-lg hover:bg-indigo-600 transition">
                Dashboard
              </Link>
            )}
            {parentOnly && (
              <Link href="/parent-dashboard" className="px-3 py-2 rounded-lg hover:bg-indigo-600 transition">
                My Child
              </Link>
            )}
            {groups.map((g) => (
              <div key={g.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
                  className="px-3 py-2 rounded-lg hover:bg-indigo-600 transition flex items-center gap-1"
                >
                  {g.label} <span className="text-xs">▾</span>
                </button>
                {openGroup === g.label && (
                  <div className="absolute left-0 mt-1 w-52 bg-white text-gray-800 rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {g.items.map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        onClick={() => setOpenGroup(null)}
                        className="block px-4 py-2 text-sm hover:bg-indigo-50"
                      >
                        {i.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-3 ml-3">
              {loggedIn ? (
                <>
                  {name && <span className="hidden xl:inline text-indigo-200 text-xs">{name}</span>}
                  <button
                    onClick={handleLogout}
                    className="bg-white text-indigo-700 px-3 py-1 rounded-lg font-semibold hover:bg-indigo-50 transition"
                  >
                    Logout
                  </button>
                </>
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
          </div>

          <button
            type="button"
            className="lg:hidden text-2xl px-2"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Phone menu */}
        {menuOpen && (
          <div className="lg:hidden pb-4 max-h-[75vh] overflow-y-auto text-sm">
            {showMenu && (
              <Link href="/dashboard" className="block py-3 font-semibold">
                Dashboard
              </Link>
            )}
            {parentOnly && (
              <Link href="/parent-dashboard" className="block py-3 font-semibold">
                My Child
              </Link>
            )}
            {groups.map((g) => (
              <div key={g.label} className="border-t border-indigo-600">
                <button
                  type="button"
                  onClick={() => setOpenMobile(openMobile === g.label ? null : g.label)}
                  className="w-full flex justify-between items-center py-3 font-semibold"
                >
                  {g.label}
                  <span>{openMobile === g.label ? '▲' : '▾'}</span>
                </button>
                {openMobile === g.label && (
                  <div className="pb-2 pl-3 flex flex-col">
                    {g.items.map((i) => (
                      <Link key={i.href} href={i.href} className="py-2 text-indigo-100 hover:text-white">
                        {i.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-indigo-600 pt-3">
              {name && (
                <p className="text-indigo-200 text-xs mb-2">
                  {name}
                  {role && role !== 'Unknown' ? ` (${role})` : ''}
                </p>
              )}
              {loggedIn ? (
                <button onClick={handleLogout} className="font-semibold">
                  Logout
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link href="/login">Staff Login</Link>
                  <Link href="/parent-login" className="font-semibold">
                    Parent Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
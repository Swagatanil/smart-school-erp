'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

// Ye pages bina staff login ke khul sakte hain
const PUBLIC_PATHS = ['/', '/login', '/signup', '/parent-login', '/parent-dashboard']

// Kis page ko kaunse roles dekh sakte hain (baaki sab pages: koi bhi staff)
const ROLE_RULES = [
  { path: '/staff', roles: ['Principal', 'Admin Staff'] },
  { path: '/certificates', roles: ['Principal', 'Admin Staff'] },
  { path: '/admissions', roles: ['Principal', 'Admin Staff', 'Accountant'] },
  { path: '/fees', roles: ['Principal', 'Admin Staff', 'Accountant'] },
  { path: '/fee-structure', roles: ['Principal', 'Admin Staff', 'Accountant'] },
  { path: '/import', roles: ['Principal', 'Admin Staff'] },
]

export default function AuthGuard({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setStatus('ok')
      return
    }

    setStatus('checking')

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('staff')
        .select('role')
        .ilike('email', user.email)
        .maybeSingle()

      const role = data ? data.role : null
      if (!role) {
        setStatus('not-staff')
        return
      }

      const rule = ROLE_RULES.find(
        (r) => pathname === r.path || pathname.startsWith(r.path + '/')
      )
      if (rule && !rule.roles.includes(role)) {
        setStatus('denied')
        return
      }

      setStatus('ok')
    }

    check()
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (status === 'checking') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400">Checking access...</p>
      </div>
    )
  }

  if (status === 'not-staff' || status === 'denied') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
          <p className="text-gray-500 mt-2">
            {status === 'not-staff'
              ? 'Ye account staff list me registered nahi hai. Admin se apna email Staff me add karwao.'
              : 'Aapko ye page dekhne ki permission nahi hai.'}
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return children
}
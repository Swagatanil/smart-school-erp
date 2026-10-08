'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './supabaseClient'

export function useRoleGuard(allowedRoles) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('staff')
        .select('role')
        .eq('email', user.email)
        .maybeSingle()

      const role = data ? data.role : null

      if (role && allowedRoles.includes(role)) {
        setAllowed(true)
      } else {
        setAllowed(false)
      }
      setLoading(false)
    }

    check()
  }, [])

  return { loading, allowed }
}
'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabaseClient'

const DEFAULT = { name: 'My School', address: '', phone: '', email: '', principal: '', logo: '' }

let cache = null
let inflight = null
const listeners = new Set()

const clean = (d) => ({
  name: d.name || DEFAULT.name,
  address: d.address || '',
  phone: d.phone || '',
  email: d.email || '',
  principal: d.principal || '',
  logo: d.logo || '',
})

function load() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    const supabase = createClient()
    inflight = supabase
      .rpc('school_info')
      .then(({ data, error }) => {
        cache = !error && data ? clean(data) : DEFAULT
        inflight = null
        return cache
      })
      .catch(() => {
        inflight = null
        return DEFAULT
      })
  }
  return inflight
}

export async function refreshSchool() {
  cache = null
  inflight = null
  const s = await load()
  listeners.forEach((fn) => fn(s))
  return s
}

export function useSchool() {
  const [school, setSchool] = useState(cache || DEFAULT)

  useEffect(() => {
    let alive = true
    load().then((s) => {
      if (alive) setSchool(s)
    })
    const fn = (s) => {
      if (alive) setSchool(s)
    }
    listeners.add(fn)
    return () => {
      alive = false
      listeners.delete(fn)
    }
  }, [])

  return school
}
import { createBrowserClient } from '@supabase/ssr'

const SAFE_RPC = ['exam_names', 'school_results', 'school_info', 'parent_portal']

function demoFetch(input, init) {
  try {
    const demo = typeof window !== 'undefined' && window.localStorage.getItem('demoMode') === '1'
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase()
    const url = typeof input === 'string' ? input : (input && input.url) || String(input)
    if (demo && method !== 'GET' && method !== 'HEAD' && url.includes('/rest/v1/')) {
      const fn = url.includes('/rpc/') ? url.split('/rpc/')[1].split('?')[0] : ''
      if (!SAFE_RPC.includes(fn)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ code: 'DEMO', message: 'Demo login: sirf dekh sakte ho, kuch badal nahi sakte.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        )
      }
    }
  } catch (e) {}
  return fetch(input, init)
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { fetch: demoFetch } }
  )
}
export async function fetchAll(build) {
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await build().order('id').range(from, from + 999)
    if (error) throw error
    all = all.concat(data || [])
    if (!data || data.length < 1000) break
    from += 1000
  }
  return all
}
/** Strip markdown code fences and extract the first JSON value from model text. */
export function extractJson(text: string): unknown {
  let t = text.trim()
  // Remove ```json ... ``` or ``` ... ``` fences.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  // Fall back to the first {...} or [...] block.
  if (!t.startsWith('{') && !t.startsWith('[')) {
    const obj = t.indexOf('{')
    const arr = t.indexOf('[')
    const start = arr === -1 ? obj : obj === -1 ? arr : Math.min(obj, arr)
    if (start >= 0) t = t.slice(start)
  }
  return JSON.parse(t)
}

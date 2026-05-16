const RAW_API_URL = import.meta.env.VITE_API_URL

function normalizeApiBaseUrl(value) {
  if (!value) return ''

  let s = String(value).trim()
  s = s.replace(/^["']+(.*)["']$/, '$1') // Strip outer quotes
  s = s.replace(/^VITE_API_URL\s*=\s*/i, '') // Strip var assignment
  s = s.replace(/^["']+(.*)["']$/, '$1') // Strip any inner quotes remaining
  s = s.replace(/\/+$/, '') // Strip trailing slashes
  return s
}

function resolveApiBaseUrl() {
  const normalized = normalizeApiBaseUrl(RAW_API_URL)
  
  // If we have a URL and it's NOT localhost, or if we are in DEV mode, use it.
  if (normalized && (!normalized.includes('localhost') || import.meta.env.DEV)) {
    return normalized
  }

  // Fallback for DEV mode if RAW_API_URL was empty or invalid
  if (import.meta.env.DEV) {
    return 'http://localhost:5000'
  }

  // In production, if VITE_API_URL is missing or incorrectly set to localhost,
  // we try to use the current origin as a last resort, though it likely won't 
  // work if the backend is on a different Render service.
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

export const API_BASE_URL = resolveApiBaseUrl()

export function apiUrl(path = '') {
  if (!path) return API_BASE_URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

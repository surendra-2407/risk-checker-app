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
  if (normalized) return normalized

  if (import.meta.env.DEV) {
    return 'http://localhost:5000'
  }

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

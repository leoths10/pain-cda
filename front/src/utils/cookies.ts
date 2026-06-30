export interface CookieOptions {
  /** Durée en secondes avant expiration, ou Date explicite. */
  expires?: number | Date
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const {
    expires,
    path = '/',
    domain,
    secure = window.location.protocol === 'https:',
    sameSite = 'lax',
  } = options

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

  if (expires) {
    const date = expires instanceof Date ? expires : new Date(Date.now() + expires * 1000)
    cookie += `; expires=${date.toUTCString()}`
  }
  if (path) cookie += `; path=${path}`
  if (domain) cookie += `; domain=${domain}`
  if (secure) cookie += '; secure'
  if (sameSite) cookie += `; samesite=${sameSite}`

  document.cookie = cookie
}

export function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`
  for (const raw of document.cookie.split(';')) {
    const cookie = raw.trim()
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.substring(prefix.length))
    }
  }
  return null
}

export function deleteCookie(name: string, options: Omit<CookieOptions, 'expires'> = {}): void {
  setCookie(name, '', { ...options, expires: new Date(0) })
}

/** Stocke une préférence utilisateur sous la clé `vtom_<key>`. */
export function setUserPreference(key: string, value: string, daysToExpire = 365): void {
  setCookie(`vtom_${key}`, value, {
    expires: daysToExpire * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })
}

export function getUserPreference(key: string): string | null {
  return getCookie(`vtom_${key}`)
}

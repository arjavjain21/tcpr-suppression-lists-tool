/**
 * Input Parsing Utilities
 * Handles emails, domains, validation, normalization, and deduplication
 */

export interface ParsedInput {
  original: string
  type: 'email' | 'domain'
  email: string | null
  domain: string | null
  status: 'valid' | 'invalid' | 'duplicate'
  error?: string
}

// Email regex - simple but effective
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Domain regex - allows domains with optional subdomains
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

/**
 * Parse raw input string into structured items
 */
export function parseInputs(rawInput: string): { items: ParsedInput[] } {
  if (!rawInput.trim()) {
    return { items: [] }
  }

  // Split by common separators: comma, semicolon, newline, tab
  const rawItems = rawInput
    .split(/[,;\n\r\t]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const parsedItems: ParsedInput[] = []
  const seen = new Set<string>()

  for (const item of rawItems) {
    const lowercased = item.toLowerCase()
    const normalized = item.trim()

    // Skip duplicates within the same batch
    if (seen.has(lowercased)) {
      parsedItems.push({
        original: item,
        type: 'email',
        email: null,
        domain: null,
        status: 'duplicate',
        error: 'Duplicate in batch'
      })
      continue
    }
    seen.add(lowercased)

    // Determine if email or domain
    if (EMAIL_REGEX.test(normalized)) {
      const email = normalized.toLowerCase()
      parsedItems.push({
        original: item,
        type: 'email',
        email,
        domain: email.split('@')[1],
        status: 'valid'
      })
    } else if (DOMAIN_REGEX.test(normalized)) {
      const domain = normalized.toLowerCase()
      parsedItems.push({
        original: item,
        type: 'domain',
        email: null,
        domain,
        status: 'valid'
      })
    } else {
      parsedItems.push({
        original: item,
        type: 'email',
        email: null,
        domain: null,
        status: 'invalid',
        error: 'Invalid email or domain format'
      })
    }
  }

  return { items: parsedItems }
}

/**
 * Validate an email string
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase())
}

/**
 * Validate a domain string
 */
export function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain.trim().toLowerCase())
}

/**
 * Normalize an email to lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalize a domain to lowercase
 */
export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase()
}

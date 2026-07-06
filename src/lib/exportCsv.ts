/**
 * CSV Export Utilities
 */

import type { LeadEventWithDetails } from './supabase'

export function downloadCsv(events: LeadEventWithDetails[], filename: string) {
  if (events.length === 0) return

  const headers = [
    'Date',
    'Type',
    'Email',
    'Domain',
    'Lead Type',
    'Setter',
    'Source',
    'Notes'
  ]

  const rows = events.map(event => [
    formatDate(event.created_at),
    event.lead_entity.entity_type,
    event.lead_entity.email || '',
    event.lead_entity.domain || '',
    event.lead_type.label,
    event.setter?.name || '',
    event.source,
    event.notes || ''
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => escapeCsv(cell)).join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

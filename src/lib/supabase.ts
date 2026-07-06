/**
 * Supabase Client Configuration
 * Using modern publishable key format
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rgnthglafgpmhiwfvluz.supabase.co'
const supabaseKey = 'sb_publishable_78OzPerzULSJwuULvSH1xA_zHyYdCF-'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Profile {
  id: string
  email: string
  created_at: string
}

export interface Setter {
  id: string
  name: string
  email: string
  active: boolean
  created_at: string
}

export interface LeadType {
  id: string
  label: string
  active: boolean
  sort_order: number
  created_at: string
}

export interface LeadEntity {
  id: string
  entity_type: 'email' | 'domain'
  email: string | null
  domain: string
  created_at: string
}

export interface LeadEvent {
  id: string
  lead_entity_id: string
  lead_type_id: string
  setter_id: string | null
  raw_input: string
  notes: string | null
  source: string
  created_by: string
  created_at: string
}

export interface LeadEventWithDetails extends LeadEvent {
  lead_entity: LeadEntity
  lead_type: LeadType
  setter: Setter | null
}

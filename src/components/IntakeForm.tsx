/**
 * Intake Form Component
 * Premium lead intake with enhanced styling and smooth animations
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, type Setter, type LeadType } from '../lib/supabase'
import { parseInputs, type ParsedInput } from '../lib/parseInputs'
import {
  FileText,
  Save,
  Loader2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface IntakeFormProps {
  onSubmitSuccess: () => void
  onViewRecords: () => void
}

export default function IntakeForm({ onSubmitSuccess, onViewRecords }: IntakeFormProps) {
  const { signOut } = useAuth()
  const { showToast } = useToast()

  const [rawInput, setRawInput] = useState('')
  const [leadTypeId, setLeadTypeId] = useState('')
  const [setterId, setSetterId] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState('manual_form')
  const [loading, setLoading] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedInput[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const [leadTypes, setLeadTypes] = useState<LeadType[]>([])
  const [setters, setSetters] = useState<Setter[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const [showSourceInfo, setShowSourceInfo] = useState(false)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      setLoadingOptions(true)
      const [leadTypesResult, settersResult] = await Promise.all([
        supabase
          .from('lead_types')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('setters')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true })
      ])

      if (leadTypesResult.error) throw leadTypesResult.error
      if (settersResult.error) throw settersResult.error

      setLeadTypes(leadTypesResult.data || [])
      setSetters(settersResult.data || [])

      if (leadTypesResult.data && leadTypesResult.data.length > 0) {
        setLeadTypeId(leadTypesResult.data[0].id)
      }
      if (settersResult.data && settersResult.data.length > 0) {
        setSetterId(settersResult.data[0].id)
      }
    } catch (err) {
      console.error('Error loading options:', err)
      showToast('error', 'Failed to load form options')
    } finally {
      setLoadingOptions(false)
    }
  }

  const handleParse = () => {
    if (!rawInput.trim()) {
      showToast('error', 'Please enter emails or domains')
      return
    }

    const result = parseInputs(rawInput)
    setParsedItems(result.items)

    const validCount = result.items.filter(p => p.status === 'valid').length
    const invalidCount = result.items.filter(p => p.status === 'invalid').length
    const duplicateCount = result.items.filter(p => p.status === 'duplicate').length

    setShowPreview(true)

    if (validCount > 0) {
      showToast('success', `Parsed ${validCount} valid item${validCount !== 1 ? 's' : ''}${invalidCount > 0 ? `, ${invalidCount} invalid` : ''}${duplicateCount > 0 ? `, ${duplicateCount} duplicates` : ''}`)
    } else {
      showToast('error', 'No valid items found')
    }
  }

  const handleSubmit = async () => {
    const validItems = parsedItems.filter(p => p.status === 'valid')

    if (validItems.length === 0) {
      showToast('error', 'No valid items to submit')
      return
    }

    setLoading(true)
    const loadingId = showToast('loading', 'Processing your submission...')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        showToast('error', 'You must be logged in to submit leads')
        setLoading(false)
        return
      }

      let newEntitiesCount = 0
      let existingEntitiesCount = 0
      let eventsCreatedCount = 0

      for (const item of validItems) {
        let leadEntityId: string
        let existingEntity: any = null

        if (item.type === 'email' && item.email) {
          const { data } = await supabase
            .from('lead_entities')
            .select('id')
            .eq('entity_type', 'email')
            .ilike('email', item.email)
            .limit(1)
            .single()
          existingEntity = data
        } else if (item.type === 'domain' && item.domain) {
          const { data } = await supabase
            .from('lead_entities')
            .select('id')
            .eq('entity_type', 'domain')
            .ilike('domain', item.domain)
            .is('email', null)
            .limit(1)
            .single()
          existingEntity = data
        }

        if (existingEntity) {
          leadEntityId = existingEntity.id
          existingEntitiesCount++
        } else {
          const { data: newEntity, error: entityError } = await supabase
            .from('lead_entities')
            .insert({
              entity_type: item.type,
              email: item.email || null,
              domain: item.domain || ''
            })
            .select('id')
            .single()
          if (entityError) throw entityError
          leadEntityId = newEntity.id
          newEntitiesCount++
        }

        const { error: eventError } = await supabase
          .from('lead_events')
          .insert({
            lead_entity_id: leadEntityId,
            lead_type_id: leadTypeId,
            setter_id: setterId || null,
            raw_input: item.original,
            notes: notes || null,
            source,
            created_by: user.id
          })
        if (eventError) throw eventError
        eventsCreatedCount++
      }

      // Reset form
      setRawInput('')
      setNotes('')
      setParsedItems([])
      setShowPreview(false)

      // Show success summary with details
      const summary = `Successfully processed ${validItems.length} item${validItems.length !== 1 ? 's' : ''}!\n\n${newEntitiesCount} new ${newEntitiesCount === 1 ? 'entity' : 'entities'} added\n${existingEntitiesCount} existing ${existingEntitiesCount === 1 ? 'entity' : 'entities'} updated\n${eventsCreatedCount} event${eventsCreatedCount === 1 ? '' : 's'} created`
      showToast('success', summary, 8000)

      // Smooth transition to records view
      setIsTransitioning(true)
      setTimeout(() => {
        onSubmitSuccess()
        onViewRecords()
        setIsTransitioning(false)
      }, 1500)

    } catch (err) {
      console.error('Error submitting:', err)
      showToast('error', 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    showToast('info', 'Signed out successfully')
  }

  if (loadingOptions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 lg:ml-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'} lg:ml-64`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add to Suppression List</h1>
              <p className="text-sm text-gray-600">Paste emails or domains to add them to your suppression list</p>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Input Section */}
            <div className="space-y-2">
              <label htmlFor="emails-domains" className="block text-sm font-semibold text-gray-900">
                Emails or Domains
              </label>
              <div className="relative">
                <textarea
                  id="emails-domains"
                  rows={8}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all shadow-sm"
                  placeholder="Paste emails or domains, separated by commas, semicolons, or new lines..."
                />
                {rawInput && (
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                    {rawInput.split(/[,\n;\t]+/).filter(s => s.trim()).length} item{rawInput.split(/[,\n;\t]+/).filter(s => s.trim()).length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Supports: commas, semicolons, new lines, or tabs as separators
              </p>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Lead Type */}
              <div className="space-y-2">
                <label htmlFor="lead-type" className="block text-sm font-semibold text-gray-900">
                  Lead Type
                </label>
                <div className="relative">
                  <select
                    id="lead-type"
                    value={leadTypeId}
                    onChange={(e) => setLeadTypeId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                  >
                    {leadTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Setter */}
              <div className="space-y-2">
                <label htmlFor="setter" className="block text-sm font-semibold text-gray-900">
                  Setter
                </label>
                <div className="relative">
                  <select
                    id="setter"
                    value={setterId}
                    onChange={(e) => setSetterId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                  >
                    {setters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <label htmlFor="source" className="block text-sm font-semibold text-gray-900">
                  Source
                </label>
                <input
                  id="source"
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-semibold text-gray-900">
                  Notes <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {!showPreview ? (
                <button
                  onClick={handleParse}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Parse & Preview
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowPreview(false)
                      setParsedItems([])
                    }}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-all duration-200 text-sm font-semibold disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Submit {parsedItems.filter(p => p.status === 'valid').length} Valid
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Preview Table */}
        {showPreview && parsedItems.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Preview
              </h3>
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="flex items-center gap-1 text-green-700 bg-green-50 px-3 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  {parsedItems.filter(p => p.status === 'valid').length} valid
                </span>
                <span className="flex items-center gap-1 text-red-700 bg-red-50 px-3 py-1 rounded-full">
                  <X className="w-3 h-3" />
                  {parsedItems.filter(p => p.status === 'invalid').length} invalid
                </span>
                <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {parsedItems.filter(p => p.status === 'duplicate').length} duplicates
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Original
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedItems.map((item, index) => (
                    <tr
                      key={index}
                      className={`transition-colors ${
                        item.status === 'invalid' ? 'bg-red-50' : item.status === 'duplicate' ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {item.original}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          item.type === 'email'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.email || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.domain || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-lg">
                            <Check className="w-3 h-3" />
                            Valid
                          </span>
                        ) : item.status === 'invalid' ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold bg-red-50 px-2.5 py-1 rounded-lg">
                            <X className="w-3 h-3" />
                            {item.error || 'Invalid'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                            Duplicate
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Recent Records Component
 * Premium records view with enhanced styling and animations
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, type Setter, type LeadType } from '../lib/supabase'
import { downloadCsv } from '../lib/exportCsv'
import {
  Search,
  Download,
  Loader2,
  LogOut,
  Plus,
  Database,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

interface RecentRecordsProps {
  onAddNew: () => void
}

export default function RecentRecords({ onAddNew }: RecentRecordsProps) {
  const { signOut } = useAuth()
  const { showToast } = useToast()

  const [events, setEvents] = useState<any[]>([])
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [leadTypeFilter, setLeadTypeFilter] = useState<string>('')
  const [setterFilter, setSetterFilter] = useState<string>('')

  const [leadTypes, setLeadTypes] = useState<LeadType[]>([])
  const [setters, setSetters] = useState<Setter[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadEvents()
    loadFilterOptions()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [events, searchQuery, leadTypeFilter, setterFilter])

  const loadEvents = async () => {
    try {
      setLoading(true)

      console.log('Loading events...')

      // Try different query approaches
      let data, error

      // Approach 1: Standard join syntax
      const result1 = await supabase
        .from('lead_events')
        .select(`
          *,
          lead_entity:lead_entities(*),
          lead_type:lead_types(*),
          setter:setters(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      console.log('Query result:', { data: result1.data, error: result1.error, count: result1.data?.length })

      if (result1.error) {
        console.log('Standard join failed, trying explicit FK syntax...')

        // Approach 2: Explicit FK syntax
        const result2 = await supabase
          .from('lead_events')
          .select('*, lead_entities!inner(id, entity_type, email, domain), lead_types!inner(id, label), setters(id, name, email)')
          .order('created_at', { ascending: false })
          .limit(100)

        console.log('Explicit FK result:', { data: result2.data, error: result2.error })

        if (result2.error) {
          // Approach 3: Manual queries
          console.log('Join queries failed, trying separate queries...')

          const eventsResult = await supabase
            .from('lead_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

          console.log('Events query:', { data: eventsResult.data, error: eventsResult.error, count: eventsResult.data?.length })

          if (eventsResult.error) throw eventsResult.error

          // Load related data separately
          const leadEntitiesResult = await supabase.from('lead_entities').select('*')
          const leadTypesResult = await supabase.from('lead_types').select('*')
          const settersResult = await supabase.from('setters').select('*')

          // Create lookup maps
          const entityMap = new Map((leadEntitiesResult.data || []).map(e => [e.id, e]))
          const typeMap = new Map((leadTypesResult.data || []).map(t => [t.id, t]))
          const setterMap = new Map((settersResult.data || []).map(s => [s.id, s]))

          // Merge data
          const mergedEvents = (eventsResult.data || []).map(event => ({
            ...event,
            lead_entity: entityMap.get(event.lead_entity_id) || null,
            lead_type: typeMap.get(event.lead_type_id) || null,
            setter: setterMap.get(event.setter_id) || null,
          }))

          console.log('Merged events:', mergedEvents.length)
          setEvents(mergedEvents)
          setFilteredEvents(mergedEvents)
          return
        }

        data = result2.data
        error = result2.error
      } else {
        data = result1.data
        error = result1.error
      }

      if (error) throw error
      setEvents(data || [])
      setFilteredEvents(data || [])

      console.log('Final events set:', { count: data?.length })

    } catch (err: any) {
      console.error('Error loading events:', err)
      showToast('error', `Failed to load records: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadFilterOptions = async () => {
    try {
      const [leadTypesResult, settersResult] = await Promise.all([
        supabase.from('lead_types').select('*').eq('active', true).order('sort_order'),
        supabase.from('setters').select('*').eq('active', true).order('name')
      ])

      if (leadTypesResult.error) throw leadTypesResult.error
      if (settersResult.error) throw settersResult.error

      setLeadTypes(leadTypesResult.data || [])
      setSetters(settersResult.data || [])
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }

  const applyFilters = () => {
    let filtered = [...events]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((event) => {
        const email = event.lead_entity?.email?.toLowerCase() || event.email?.toLowerCase() || ''
        const domain = event.lead_entity?.domain?.toLowerCase() || event.domain?.toLowerCase() || ''
        return email.includes(query) || domain.includes(query)
      })
    }

    if (leadTypeFilter) {
      filtered = filtered.filter((event) =>
        event.lead_type_id === leadTypeFilter || event.lead_type?.id === leadTypeFilter
      )
    }

    if (setterFilter) {
      filtered = filtered.filter((event) =>
        event.setter_id === setterFilter || event.setter?.id === setterFilter
      )
    }

    setFilteredEvents(filtered)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEvents()
    setTimeout(() => setRefreshing(false), 500)
    showToast('success', 'Records refreshed')
  }

  const handleExport = () => {
    if (filteredEvents.length === 0) {
      showToast('error', 'No records to export')
      return
    }

    const exportData = filteredEvents.map(event => ({
      date: new Date(event.created_at).toLocaleString(),
      type: event.lead_entity?.entity_type || event.entity_type || 'unknown',
      email: event.lead_entity?.email || event.email || '',
      domain: event.lead_entity?.domain || event.domain || '',
      leadType: event.lead_type?.label || 'Unknown',
      setter: event.setter?.name || 'Unknown',
      source: event.source,
      notes: event.notes || ''
    }))

    downloadCsv(exportData as any, 'lead-events.csv')
    showToast('success', `Exported ${filteredEvents.length} records`)
  }

  const handleLogout = async () => {
    await signOut()
    showToast('info', 'Signed out successfully')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const activeFiltersCount = [
    searchQuery,
    leadTypeFilter,
    setterFilter
  ].filter(Boolean).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 lg:ml-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600 font-medium">Loading records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 lg:ml-64">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Recent Records</h1>
                <p className="text-sm text-gray-600">View and manage your lead suppression history</p>
              </div>
            </div>
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {activeFiltersCount}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {showFilters && (
            <div className="px-6 pb-4 animate-in slide-in-from-top duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Email or domain..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lead-type-filter" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Lead Type
                  </label>
                  <div className="relative">
                    <select
                      id="lead-type-filter"
                      value={leadTypeFilter}
                      onChange={(e) => setLeadTypeFilter(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                    >
                      <option value="">All Types</option>
                      {leadTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>
                          {lt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="setter-filter" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Setter
                  </label>
                  <div className="relative">
                    <select
                      id="setter-filter"
                      value={setterFilter}
                      onChange={(e) => setSetterFilter(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                    >
                      <option value="">All Setters</option>
                      {setters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredEvents.length}</span> of{' '}
              <span className="text-gray-500">{events.length}</span> records
            </p>
            <button
              onClick={handleExport}
              disabled={filteredEvents.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No records found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {events.length === 0
                  ? 'Get started by adding your first leads to the suppression list.'
                  : 'Try adjusting your filters to see more records.'}
              </p>
              {events.length === 0 && (
                <button
                  onClick={onAddNew}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Leads
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Domain
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Lead Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Setter
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Source
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEvents.map((event, index) => (
                    <tr
                      key={event.id}
                      className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-150"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(event.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                          event.lead_entity?.entity_type === 'email' || event.entity_type === 'email'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {event.lead_entity?.entity_type || event.entity_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {event.lead_entity?.email || event.email || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {event.lead_entity?.domain || event.domain || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                          {event.lead_type?.label || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {event.setter?.name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs bg-gray-100 text-gray-700">
                          {event.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs">
                        {event.notes ? (
                          <span className="block truncate" title={event.notes}>
                            {event.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

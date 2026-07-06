/**
 * Recent Records Component
 * Clean records view with filters, CSV export, and toast notifications
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, type LeadEventWithDetails, type Setter, type LeadType } from '../lib/supabase'
import { downloadCsv } from '../lib/exportCsv'
import {
  Search,
  Download,
  Loader2,
  LogOut,
  Plus,
  Database,
  AlertCircle,
  X,
  Filter,
} from 'lucide-react'

interface RecentRecordsProps {
  onAddNew: () => void
}

export default function RecentRecords({ onAddNew }: RecentRecordsProps) {
  const { signOut } = useAuth()
  const { showToast } = useToast()

  const [events, setEvents] = useState<LeadEventWithDetails[]>([])
  const [filteredEvents, setFilteredEvents] = useState<LeadEventWithDetails[]>([])
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

      const { data, error } = await supabase
        .from('lead_events')
        .select(`
          *,
          lead_entity:lead_entities(*),
          lead_type:lead_types(*),
          setter:setters(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setEvents(data || [])
      setFilteredEvents(data || [])
    } catch (err) {
      console.error('Error loading events:', err)
      showToast('error', 'Failed to load records')
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
        const email = event.lead_entity.email?.toLowerCase() || ''
        const domain = event.lead_entity.domain?.toLowerCase() || ''
        return email.includes(query) || domain.includes(query)
      })
    }

    if (leadTypeFilter) {
      filtered = filtered.filter((event) => event.lead_type_id === leadTypeFilter)
    }

    if (setterFilter) {
      filtered = filtered.filter((event) => event.setter_id === setterFilter)
    }

    setFilteredEvents(filtered)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEvents()
    setTimeout(() => setRefreshing(false), 500)
    showToast('info', 'Records refreshed')
  }

  const handleExport = () => {
    if (filteredEvents.length === 0) {
      showToast('error', 'No records to export')
      return
    }
    downloadCsv(filteredEvents, 'lead-events.csv')
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Recent Records</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <Loader2 className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={onAddNew}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Lead Suppression Records</h2>
          <p className="mt-1 text-sm text-gray-600">
            View and manage your lead suppression history
          </p>
        </div>

        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="Email or domain..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lead-type-filter" className="block text-xs font-medium text-gray-700 mb-1">
                    Lead Type
                  </label>
                  <select
                    id="lead-type-filter"
                    value={leadTypeFilter}
                    onChange={(e) => setLeadTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  >
                    <option value="">All Types</option>
                    {leadTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="setter-filter" className="block text-xs font-medium text-gray-700 mb-1">
                    Setter
                  </label>
                  <select
                    id="setter-filter"
                    value={setterFilter}
                    onChange={(e) => setSetterFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{filteredEvents.length}</span> of{' '}
              <span className="text-gray-500">{events.length}</span> records
            </p>
            <button
              onClick={handleExport}
              disabled={filteredEvents.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900">No records found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {events.length === 0
                  ? 'No records have been created yet.'
                  : 'Try adjusting your filters.'}
              </p>
              {events.length === 0 && (
                <button
                  onClick={onAddNew}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Leads
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Lead Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Setter
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(event.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          event.lead_entity.entity_type === 'email'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {event.lead_entity.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {event.lead_entity.email || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {event.lead_entity.domain || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {event.lead_type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {event.setter?.name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {event.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
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
      </main>
    </div>
  )
}

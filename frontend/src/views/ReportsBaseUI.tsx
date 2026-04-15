import React, { useEffect, useState } from 'react'
import { Button } from '../components/base/Button'
import { Card, CardContent } from '../components/base/Card'
import { Badge } from '../components/base/Badge'
import { Alert } from '../components/base/Alert'
import { Spinner } from '../components/base/Spinner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/base/Table'
import {
  FileSpreadsheetIcon,
  ExternalLinkIcon,
  Building2Icon,
  CalendarIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface Client {
  id: string
  name: string
  websiteUrl: string
  keywords: string
  description: string
  status: string
}

interface ReportOpportunity {
  id: string
  threadTitle: string
  threadUrl: string
  heuristicScore: number | null
  aiScore: number | null
  aiScoreCommentary: string | null
  aiScoreFactors: {
    subredditRelevance?: number
    topicMatch?: number
    intent?: number
    naturalFit?: number
  } | null
  status: string
  commentText: string | null
  citationAnchorText: string | null
  commentPermalink: string | null
  subreddit: string
  threadCreatedAt: string | null
  publishedAt: string | null
  deletedAt: string | null
  createdAt: string
  opportunityType: string
  parentThreadTitle: string | null
}

export function ReportsBaseUI() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [allOpportunities, setAllOpportunities] = useState<ReportOpportunity[]>([])
  const [opportunities, setOpportunities] = useState<ReportOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'excel' | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Record<string, { commentary: boolean; comment: boolean }>>({})

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [selectedClientIds])

  const fetchReportData = async () => {
    setLoading(true)
    setError(null)
    try {
      // If no clients selected, fetch all
      const clientId = selectedClientIds.length === 0 ? 'all' : selectedClientIds.join(',')
      const res = await fetch(`/api/reports/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setAllOpportunities(data.opportunities)
        setOpportunities(data.opportunities)
      } else {
        setError('Failed to load report data')
      }
    } catch (err) {
      setError('Network error loading report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = allOpportunities

    if (statusFilter !== 'all') {
      filtered = filtered.filter((opp) => opp.status === statusFilter)
    }

    if (startDate || endDate) {
      filtered = filtered.filter((opp) => {
        const oppDate = new Date(opp.createdAt)
        if (startDate && oppDate < startDate) return false
        if (endDate && oppDate > endDate) return false
        return true
      })
    }

    setOpportunities(filtered)
  }, [startDate, endDate, statusFilter, allOpportunities])

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const clientNames = selectedClientIds.length === 0 
        ? 'all-clients'
        : selectedClientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join('-')
      const exportData = opportunities.map((opp) => ({
        'Thread Title': opp.threadTitle,
        'Thread URL': opp.threadUrl,
        'Subreddit': opp.subreddit,
        'Type': opp.opportunityType === 'pile_on' ? 'Pile-On' : 'Primary',
        'Parent Thread': opp.parentThreadTitle ?? 'N/A',
        'Heuristic Score': opp.heuristicScore ?? 'N/A',
        'AI Score': opp.aiScore ?? 'N/A',
        'Status': opp.status,
        'AI Commentary': opp.aiScoreCommentary ?? 'N/A',
        'Comment Text': opp.commentText ?? 'N/A',
        'Citation Anchor Text': opp.citationAnchorText ?? 'N/A',
        'Comment Permalink': opp.commentPermalink ?? 'N/A',
        'Discovered': new Date(opp.createdAt).toLocaleDateString(),
        'Published': opp.publishedAt ? new Date(opp.publishedAt).toLocaleDateString() : 'N/A',
        'Deleted': opp.deletedAt ? new Date(opp.deletedAt).toLocaleDateString() : 'No',
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `${clientNames}-opportunities.xlsx`)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
      case 'published':
      case 'verified':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
      case 'unverified':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
      case 'dismissed':
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    }
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const toggleAllClients = () => {
    if (selectedClientIds.length === clients.length) {
      setSelectedClientIds([])
    } else {
      setSelectedClientIds(clients.map(c => c.id))
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
        <Button
          variant="outlined"
          size="sm"
          onClick={handleExportExcel}
          disabled={loading || opportunities.length === 0 || exporting !== null}
          className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        >
          {exporting === 'excel' ? <Spinner size="sm" className="mr-2" /> : <FileSpreadsheetIcon size={16} className="mr-2" />}
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Client Multi-Selector */}
            <div className="flex items-start gap-2">
              <Building2Icon size={13} className="text-slate-500 mt-1" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">Clients:</span>
                  <button
                    onClick={toggleAllClients}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    {selectedClientIds.length === clients.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({selectedClientIds.length} selected)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-w-2xl">
                  {clients.map((client) => (
                    <label
                      key={client.id}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      style={{
                        borderColor: selectedClientIds.includes(client.id) ? '#f97316' : undefined,
                        backgroundColor: selectedClientIds.includes(client.id) ? '#fff7ed' : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClientIds.includes(client.id)}
                        onChange={() => toggleClientSelection(client.id)}
                        className="w-3 h-3 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{client.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">Status:</span>
              <div className="flex gap-1">
                {['all', 'new', 'published', 'unverified', 'deleted_by_mod'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                      statusFilter === status
                        ? 'bg-orange-100 text-orange-600 border border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status === 'deleted_by_mod' ? 'Deleted' : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <CalendarIcon size={13} className="text-slate-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">Date:</span>
              <input
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                max={endDate ? endDate.toISOString().split('T')[0] : undefined}
                className="px-2 py-1 text-xs rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-[140px]"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                min={startDate ? startDate.toISOString().split('T')[0] : undefined}
                className="px-2 py-1 text-xs rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-[140px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : opportunities.length === 0 ? (
        <Alert variant="info">No opportunities found for this client</Alert>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    'Thread Title',
                    'Type',
                    'Scores',
                    'Status',
                    'Deleted',
                    'AI Commentary',
                    'Comment',
                    'Citations',
                    'Actions',
                  ].map((h) => (
                    <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp, idx) => {
                  const expandedCommentary = expandedRows[opp.id]?.commentary || false
                  const expandedComment = expandedRows[opp.id]?.comment || false

                  const commentaryText = opp.aiScoreCommentary || 'N/A'
                  const commentText = opp.commentText || 'N/A'
                  const commentaryTruncated = commentaryText.length > 150
                  const commentTruncated = commentText.length > 200

                  const toggleCommentary = () => {
                    setExpandedRows((prev) => ({
                      ...prev,
                      [opp.id]: { ...prev[opp.id], commentary: !expandedCommentary },
                    }))
                  }

                  const toggleComment = () => {
                    setExpandedRows((prev) => ({
                      ...prev,
                      [opp.id]: { ...prev[opp.id], comment: !expandedComment },
                    }))
                  }

                  return (
                    <TableRow
                      key={opp.id}
                      className={idx % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-900/20'}
                    >
                      <TableCell className="min-w-[200px]">
                        <div>
                          <div
                            className="text-sm font-semibold text-slate-900 dark:text-slate-100 overflow-hidden text-ellipsis whitespace-nowrap max-w-[250px]"
                            title={opp.threadTitle}
                          >
                            {opp.threadTitle}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-slate-500">r/{opp.subreddit}</span>
                          </div>
                          {opp.parentThreadTitle && (
                            <div className="text-xs text-slate-400 mt-0.5 italic">
                              Parent:{' '}
                              {opp.parentThreadTitle.length > 40
                                ? opp.parentThreadTitle.substring(0, 40) + '...'
                                : opp.parentThreadTitle}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={opp.opportunityType === 'pile_on' ? 'info' : 'default'}
                          className={
                            opp.opportunityType === 'pile_on'
                              ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800'
                              : ''
                          }
                        >
                          {opp.opportunityType === 'pile_on' ? 'Pile-On' : 'Primary'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <div className="mb-0.5">
                            Heuristic: {opp.heuristicScore ? (opp.heuristicScore * 100).toFixed(0) + '%' : 'N/A'}
                          </div>
                          <div>AI: {opp.aiScore ? (opp.aiScore * 100).toFixed(0) + '%' : 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded border capitalize ${getStatusColor(
                            opp.status
                          )}`}
                        >
                          {opp.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {opp.deletedAt ? (
                          <div>
                            <div className="text-xs font-semibold text-red-600 dark:text-red-400">Yes</div>
                            <div className="text-xs text-slate-500">
                              {new Date(opp.deletedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[250px] max-w-[350px]">
                        <div>
                          <div
                            className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words ${
                              !expandedCommentary ? 'line-clamp-3' : ''
                            }`}
                          >
                            {commentaryText}
                          </div>
                          {commentaryTruncated && (
                            <button
                              onClick={toggleCommentary}
                              className="text-xs text-blue-600 hover:underline mt-1"
                            >
                              {expandedCommentary ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[200px] max-w-[400px]">
                        <div>
                          <div
                            className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words ${
                              !expandedComment ? 'line-clamp-4' : ''
                            }`}
                          >
                            {commentText}
                          </div>
                          {commentTruncated && (
                            <button
                              onClick={toggleComment}
                              className="text-xs text-blue-600 hover:underline mt-1"
                            >
                              {expandedComment ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {opp.citationAnchorText ? (
                          <div
                            className="text-xs text-blue-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]"
                            title={opp.citationAnchorText}
                          >
                            {opp.citationAnchorText}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {opp.threadUrl && (
                          <a
                            href={opp.threadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 px-2 py-1 rounded"
                          >
                            <ExternalLinkIcon size={12} />
                            View
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}

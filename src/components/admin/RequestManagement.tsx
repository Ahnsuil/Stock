import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClipboardList, Check, X, Eye, Calendar, User } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface RequestItem {
  item_id: string
  quantity: number
  item_name: string
}

interface Request {
  id: string
  user_id: string
  items: RequestItem[]
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
  is_issued?: boolean
}

const RequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showIssueModal, setShowIssueModal] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  const checkIfRequestIssued = async (requestId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('issued_items')
        .select('id')
        .eq('request_id', requestId)
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking issued status:', error)
      return false
    }
  }

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Check issued status for each request
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (request) => {
          const isIssued = await checkIfRequestIssued(request.id)
          return {
            ...request,
            user_name: request.users.name,
            user_email: request.users.email,
            is_issued: isIssued
          }
        })
      )

      setRequests(requestsWithDetails)
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    if (!selectedStatus) return true
    if (selectedStatus === 'issued') return request.is_issued
    return request.status === selectedStatus
  })

  const handleUpdateRequestStatus = async (
    requestId: string, 
    status: 'approved' | 'rejected', 
    adminNotes?: string
  ) => {
    try {
      // If approving, check stock availability and deduct quantities
      if (status === 'approved') {
        // First get the request details
        const { data: request, error: requestError } = await supabase
          .from('requests')
          .select('items')
          .eq('id', requestId)
          .single()

        if (requestError) throw requestError

        // Check stock availability for each item
        for (const item of request.items) {
          const { data: stockData, error: stockError } = await supabase
            .from('stock_items')
            .select('quantity')
            .eq('id', item.item_id)
            .single()

          if (stockError) throw stockError

          if (stockData.quantity < item.quantity) {
            toast.error(`Insufficient stock for ${item.item_name}. Available: ${stockData.quantity}, Requested: ${item.quantity}`)
            return
          }
        }

        // Deduct stock quantities for approved items
        for (const item of request.items) {
          // First get the current quantity
          const { data: currentItem, error: fetchError } = await supabase
            .from('stock_items')
            .select('quantity')
            .eq('id', item.item_id)
            .single()

          if (fetchError) {
            console.error('Error fetching current stock:', fetchError)
            toast.error(`Failed to fetch stock for ${item.item_name}`)
            return
          }

          // Calculate new quantity
          const newQuantity = currentItem.quantity - item.quantity

          // Update with the new quantity
          const { error: stockUpdateError } = await supabase
            .from('stock_items')
            .update({ quantity: newQuantity })
            .eq('id', item.item_id)

          if (stockUpdateError) {
            console.error('Error updating stock quantity:', stockUpdateError)
            toast.error(`Failed to update stock for ${item.item_name}`)
            return
          }
        }
      }

      // Update request status
      const { error } = await supabase
        .from('requests')
        .update({ 
          status, 
          admin_notes: adminNotes || null 
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success(`Request ${status} successfully`)
      fetchRequests()
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error(`Failed to ${status} request`)
    }
  }

  const handleIssueItems = async (request: Request, returnDays: number, notes: string, issuedTo: string) => {
    try {
      // Create issued items (for returnable items only)
      // Stock has already been deducted when the request was approved
      const returnDate = new Date()
      returnDate.setDate(returnDate.getDate() + returnDays)

      const issuedItems = request.items.map(item => ({
        item_id: item.item_id,
        user_id: request.user_id,
        request_id: request.id,
        quantity_issued: item.quantity,
        return_due: returnDate.toISOString(),
        admin_notes: notes,
        issued_to: issuedTo
      }))

      const { error: issueError } = await supabase
        .from('issued_items')
        .insert(issuedItems)

      if (issueError) throw issueError

      toast.success('Items issued successfully - these are returnable items')
      setShowIssueModal(false)
      setSelectedRequest(null)
      fetchRequests()
    } catch (error) {
      console.error('Error issuing items:', error)
      toast.error('Failed to issue items')
    }
  }

  const getStatusBadge = (status: string, isIssued?: boolean) => {
    if (isIssued) {
      return <span className="badge-info">Issued</span>
    }
    
    switch (status) {
      case 'pending':
        return <span className="badge-warning">Pending</span>
      case 'approved':
        return <span className="badge-success">Approved</span>
      case 'rejected':
        return <span className="badge-danger">Rejected</span>
      default:
        return <span className="badge-gray">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and approve stock requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="issued">Issued</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ClipboardList className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Request #{request.id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {request.user_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {request.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {request.items.length} item(s)
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {request.items.slice(0, 2).map(item => 
                        `${item.item_name} (${item.quantity})`
                      ).join(', ')}
                      {request.items.length > 2 && '...'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status, request.is_issued)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateRequestStatus(request.id, 'approved')}
                            className="text-success-600 dark:text-success-400 hover:text-success-900 dark:hover:text-success-300"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateRequestStatus(request.id, 'rejected')}
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-900 dark:hover:text-danger-300"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && !request.is_issued && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowIssueModal(true)
                          }}
                          className="btn-primary text-xs py-1 px-2"
                        >
                          Issue Items
                        </button>
                      )}
                      {request.is_issued && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                          Items Issued
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No requests found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedStatus 
                ? `No ${selectedStatus} requests at the moment.`
                : 'No requests have been submitted yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && !showIssueModal && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdateStatus={handleUpdateRequestStatus}
        />
      )}

      {/* Issue Items Modal */}
      {showIssueModal && selectedRequest && (
        <IssueItemsModal
          request={selectedRequest}
          onIssue={handleIssueItems}
          onClose={() => {
            setShowIssueModal(false)
            setSelectedRequest(null)
          }}
        />
      )}
    </div>
  )
}

// Request Details Modal Component
interface RequestDetailsModalProps {
  request: Request
  onClose: () => void
  onUpdateStatus: (id: string, status: 'approved' | 'rejected', notes?: string) => void
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ request, onClose, onUpdateStatus }) => {
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || '')

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Request Details - #{request.id.slice(-8)}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Requested By</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{request.user_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{request.user_email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">{getStatusBadge(request.status, request.is_issued)}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requested Items</label>
              <div className="border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {request.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.item_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="input mt-1"
                rows={3}
                placeholder="Add notes for this request..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
              {request.status === 'pending' && (
                <>
                  <button
                    onClick={() => onUpdateStatus(request.id, 'rejected', adminNotes)}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => onUpdateStatus(request.id, 'approved', adminNotes)}
                    className="btn-success"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function getStatusBadge(status: string, isIssued?: boolean) {
    if (isIssued) {
      return <span className="badge-info">Issued</span>
    }
    
    switch (status) {
      case 'pending':
        return <span className="badge-warning">Pending</span>
      case 'approved':
        return <span className="badge-success">Approved</span>
      case 'rejected':
        return <span className="badge-danger">Rejected</span>
      default:
        return <span className="badge-gray">{status}</span>
    }
  }
}

// Issue Items Modal Component
interface IssueItemsModalProps {
  request: Request
  onIssue: (request: Request, returnDays: number, notes: string, issuedTo: string) => void
  onClose: () => void
}

const IssueItemsModal: React.FC<IssueItemsModalProps> = ({ request, onIssue, onClose }) => {
  const [returnDays, setReturnDays] = useState(7)
  const [notes, setNotes] = useState('')
  const [issuedTo, setIssuedTo] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onIssue(request, returnDays, notes, issuedTo)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Issue Items - #{request.id.slice(-8)}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Return Due (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={returnDays}
                onChange={(e) => setReturnDays(parseInt(e.target.value) || 7)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issued to Organisation or Person</label>
              <input
                type="text"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                className="input"
                placeholder="Enter organisation or person name..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issue Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={3}
                placeholder="Any special instructions or notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Issue Items
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RequestManagement

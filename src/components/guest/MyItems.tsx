import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Package, Calendar, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { format, isAfter, differenceInDays } from 'date-fns'

interface IssuedItem {
  id: string
  item_id: string
  user_id: string
  request_id: string | null
  quantity_issued: number
  issued_date: string
  return_due: string
  returned: boolean
  return_date: string | null
  admin_notes: string | null
  issued_to: string | null
  item_name?: string
  item_type?: string
  batch_number?: string | null
  expiry_date?: string | null
  is_overdue?: boolean
  days_overdue?: number
}

const MyItems: React.FC = () => {
  const { profile } = useAuth()
  const [issuedItems, setIssuedItems] = useState<IssuedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferringItem, setTransferringItem] = useState<IssuedItem | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name: string; department: string | null }>>([])

  useEffect(() => {
    if (profile) {
      fetchMyIssuedItems()
      fetchUsers()
    }
  }, [profile])

  const fetchMyIssuedItems = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('issued_items')
        .select(`
          *,
          stock_items!inner(name, type, batch_number, expiry_date)
        `)
        .eq('user_id', profile.id)
        .order('issued_date', { ascending: false })

      if (error) throw error

      const itemsWithDetails = (data || []).map(item => {
        const isOverdue = !item.returned && isAfter(new Date(), new Date(item.return_due))
        const daysOverdue = isOverdue ? differenceInDays(new Date(), new Date(item.return_due)) : 0

        return {
          ...item,
          item_name: item.stock_items.name,
          item_type: item.stock_items.type,
          batch_number: item.stock_items.batch_number,
          expiry_date: item.stock_items.expiry_date,
          is_overdue: isOverdue,
          days_overdue: daysOverdue
        }
      })

      setIssuedItems(itemsWithDetails)
    } catch (error) {
      console.error('Error fetching issued items:', error)
      toast.error('Failed to load your items')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, department')
        .eq('role', 'guest')
        .neq('id', profile?.id) // Exclude current user

      if (error) throw error
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleTransferItem = async (issuedItemId: string, toUserId: string, notes: string) => {
    if (!profile) return

    try {
      // Get the issued item
      const { data: issuedItem, error: fetchError } = await supabase
        .from('issued_items')
        .select('*')
        .eq('id', issuedItemId)
        .single()

      if (fetchError) throw fetchError

      if (issuedItem.returned) {
        toast.error('Cannot transfer returned items')
        return
      }

      // Update the issued item to transfer to new user
      const { error: updateError } = await supabase
        .from('issued_items')
        .update({ user_id: toUserId })
        .eq('id', issuedItemId)

      if (updateError) throw updateError

      // Record the transfer
      const { error: transferError } = await supabase
        .from('item_transfers')
        .insert({
          issued_item_id: issuedItemId,
          from_user_id: profile.id,
          to_user_id: toUserId,
          notes: notes || null
        })

      if (transferError) throw transferError

      toast.success('Item transferred successfully')
      fetchMyIssuedItems()
      setShowTransferModal(false)
      setTransferringItem(null)
    } catch (error) {
      console.error('Error transferring item:', error)
      toast.error('Failed to transfer item')
    }
  }

  const filteredItems = issuedItems.filter(item => {
    switch (selectedFilter) {
      case 'overdue':
        return item.is_overdue
      case 'returned':
        return item.returned
      case 'active':
        return !item.returned && !item.is_overdue
      default:
        return true
    }
  })

  const getStatusBadge = (item: IssuedItem) => {
    if (item.returned) {
      return <span className="badge-success">Returned</span>
    } else if (item.is_overdue) {
      return <span className="badge-danger">Overdue ({item.days_overdue} days)</span>
    } else {
      return <span className="badge-warning">Active</span>
    }
  }

  const getStatusIcon = (item: IssuedItem) => {
    if (item.returned) {
      return <CheckCircle className="h-5 w-5 text-success-600" />
    } else if (item.is_overdue) {
      return <AlertTriangle className="h-5 w-5 text-danger-600" />
    } else {
      return <Clock className="h-5 w-5 text-warning-600" />
    }
  }

  const overdueCount = issuedItems.filter(item => item.is_overdue).length
  const activeCount = issuedItems.filter(item => !item.returned && !item.is_overdue).length
  const returnedCount = issuedItems.filter(item => item.returned).length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Items</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track items you've borrowed and their return dates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Items
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {issuedItems.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-danger-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Overdue
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {overdueCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-warning-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {activeCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Returned
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {returnedCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Alert for Overdue Items */}
      {overdueCount > 0 && (
        <div className="bg-danger-50 border border-danger-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-danger-800">
                You have {overdueCount} overdue item{overdueCount > 1 ? 's' : ''}
              </h3>
              <div className="mt-2 text-sm text-danger-700">
                <p>Please return your overdue items as soon as possible.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Items</option>
            <option value="overdue">Overdue</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            className={`card hover:shadow-md transition-shadow ${
              item.is_overdue ? 'ring-2 ring-danger-200' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                {getStatusIcon(item)}
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {item.item_name}
                  </h3>
                  <p className="text-sm text-gray-500">{item.item_type}</p>
                </div>
              </div>
              <span className="badge-primary">
                {item.quantity_issued}
              </span>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Issued:</span>
                <span className="text-gray-900">
                  {format(new Date(item.issued_date), 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due:</span>
                <span className={`font-medium ${
                  item.is_overdue ? 'text-danger-600' : 'text-gray-900'
                }`}>
                  {format(new Date(item.return_due), 'MMM dd, yyyy')}
                </span>
              </div>
              {item.issued_to && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Issued To:</span>
                  <span className="text-gray-900 font-medium">{item.issued_to}</span>
                </div>
              )}
              {(item.batch_number || item.expiry_date) && (
                <>
                  {item.batch_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Batch:</span>
                      <span className="text-gray-900">{item.batch_number}</span>
                    </div>
                  )}
                  {item.expiry_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Expiry:</span>
                      <span className="text-gray-900">{format(new Date(item.expiry_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </>
              )}
              {item.return_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Returned:</span>
                  <span className="text-success-600">
                    {format(new Date(item.return_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {item.admin_notes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <p className="text-gray-600">{item.admin_notes}</p>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              {getStatusBadge(item)}
              {!item.returned && (
                <button
                  onClick={() => {
                    setTransferringItem(item)
                    setShowTransferModal(true)
                  }}
                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center gap-1"
                  title="Transfer to another user"
                >
                  <ArrowRight className="h-4 w-4" />
                  Transfer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedFilter !== 'all' 
              ? `You have no ${selectedFilter} items.`
              : "You haven't borrowed any items yet."
            }
          </p>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && transferringItem && (
        <TransferModal
          item={transferringItem}
          users={users}
          onTransfer={handleTransferItem}
          onClose={() => {
            setShowTransferModal(false)
            setTransferringItem(null)
          }}
        />
      )}
    </div>
  )
}

// Transfer Modal Component
interface TransferModalProps {
  item: IssuedItem
  users: Array<{ id: string; name: string; department: string | null }>
  onTransfer: (issuedItemId: string, toUserId: string, notes: string) => void
  onClose: () => void
}

const TransferModal: React.FC<TransferModalProps> = ({ item, users, onTransfer, onClose }) => {
  const [formData, setFormData] = useState({
    toUserId: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.toUserId) {
      toast.error('Please select a user to transfer to')
      return
    }
    onTransfer(item.id, formData.toUserId, formData.notes)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Transfer Item
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Item</label>
              <p className="mt-1 text-sm text-gray-900">{item.item_name} ({item.item_type})</p>
              <p className="text-xs text-gray-500">Quantity: {item.quantity_issued}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Transfer To *</label>
              <select
                value={formData.toUserId}
                onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                className="input"
                required
              >
                <option value="">Select a user</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.department ? `(${user.department})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Optional notes about the transfer"
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
                Transfer Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MyItems

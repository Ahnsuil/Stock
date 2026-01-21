import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Calendar, User, Package, CheckCircle, Clock, Printer } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { format, isAfter, differenceInDays } from 'date-fns'
import IssuedItemPrintView from './IssuedItemPrintView'

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
  user_name?: string
  user_email?: string
  is_overdue?: boolean
  days_overdue?: number
}

const IssuedItemsManagement: React.FC = () => {
  const [issuedItems, setIssuedItems] = useState<IssuedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<IssuedItem | null>(null)
  const [showPrintView, setShowPrintView] = useState(false)

  useEffect(() => {
    fetchIssuedItems()
  }, [])

  const fetchIssuedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('issued_items')
        .select(`
          *,
          stock_items!inner(name, type),
          users!inner(name, email)
        `)
        .order('issued_date', { ascending: false })

      if (error) throw error

      const itemsWithDetails = (data || []).map(item => {
        const isOverdue = !item.returned && isAfter(new Date(), new Date(item.return_due))
        const daysOverdue = isOverdue ? differenceInDays(new Date(), new Date(item.return_due)) : 0

        return {
          ...item,
          item_name: item.stock_items.name,
          item_type: item.stock_items.type,
          user_name: item.users.name,
          user_email: item.users.email,
          is_overdue: isOverdue,
          days_overdue: daysOverdue
        }
      })

      setIssuedItems(itemsWithDetails)
    } catch (error) {
      console.error('Error fetching issued items:', error)
      toast.error('Failed to load issued items')
    } finally {
      setLoading(false)
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

  const handleReturnItem = async (itemId: string, returnNotes?: string) => {
    try {
      // First, get the item details to know the quantity to restore
      const { data: issuedItem, error: fetchError } = await supabase
        .from('issued_items')
        .select('item_id, quantity_issued')
        .eq('id', itemId)
        .single()

      if (fetchError) throw fetchError

      // Update the issued item as returned
      const { error } = await supabase
        .from('issued_items')
        .update({ 
          returned: true, 
          return_date: new Date().toISOString(),
          admin_notes: returnNotes || null
        })
        .eq('id', itemId)

      if (error) throw error

      // Restore stock quantity when items are returned
      const { data: currentItem, error: fetchStockError } = await supabase
        .from('stock_items')
        .select('quantity')
        .eq('id', issuedItem.item_id)
        .single()

      if (fetchStockError) {
        console.error('Error fetching current stock for return:', fetchStockError)
      } else {
        // Calculate new quantity
        const newQuantity = currentItem.quantity + issuedItem.quantity_issued

        // Update with the new quantity
        const { error: stockUpdateError } = await supabase
          .from('stock_items')
          .update({ quantity: newQuantity })
          .eq('id', issuedItem.item_id)

        if (stockUpdateError) {
          console.error('Error updating stock quantity on return:', stockUpdateError)
        }
      }

      toast.success('Item marked as returned')
      fetchIssuedItems()
    } catch (error) {
      console.error('Error returning item:', error)
      toast.error('Failed to mark item as returned')
    }
  }

  const getStatusBadge = (item: IssuedItem) => {
    if (item.returned) {
      return <span className="badge-success">Returned</span>
    } else if (item.is_overdue) {
      return <span className="badge-danger">Overdue ({item.days_overdue} days)</span>
    } else {
      return <span className="badge-warning">Active</span>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issued Items Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and manage issued inventory items
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-danger-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Overdue Items
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Items
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Returned Items
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {returnedCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Issues
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {issuedItems.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

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

      {/* Issued Items Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Issued To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Issued Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Return Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${item.is_overdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.item_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.item_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.user_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {item.issued_to || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="badge-primary">{item.quantity_issued}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(item.issued_date), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(item.return_due), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        title="View Details"
                      >
                        <Package className="h-4 w-4" />
                      </button>
                      {!item.returned && (
                        <button
                          onClick={() => handleReturnItem(item.id)}
                          className="btn-success text-xs py-1 px-2"
                        >
                          Mark Returned
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No issued items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedFilter !== 'all' 
                ? `No ${selectedFilter} items at the moment.`
                : 'No items have been issued yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <IssuedItemDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onReturn={handleReturnItem}
          onPrint={() => setShowPrintView(true)}
        />
      )}

      {/* Print View */}
      {showPrintView && selectedItem && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Print Issued Item Details</h2>
              <button
                onClick={() => setShowPrintView(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
              >
                Close Print View
              </button>
            </div>
            <IssuedItemPrintView item={selectedItem} />
          </div>
        </div>
      )}
    </div>
  )
}

// Issued Item Details Modal Component
interface IssuedItemDetailsModalProps {
  item: IssuedItem
  onClose: () => void
  onReturn: (itemId: string, notes?: string) => void
  onPrint: () => void
}

const IssuedItemDetailsModal: React.FC<IssuedItemDetailsModalProps> = ({ 
  item, 
  onClose, 
  onReturn,
  onPrint
}) => {
  const [returnNotes, setReturnNotes] = useState('')

  const handleReturn = () => {
    onReturn(item.id, returnNotes)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Issued Item Details
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.item_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.item_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.admin_notes || 'No notes'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Requested By</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.user_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.user_email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issued To</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.issued_to || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">{getStatusBadge(item)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.quantity_issued}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issued Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {format(new Date(item.issued_date), 'MMMM dd, yyyy')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Return Due</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {format(new Date(item.return_due), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>

            {item.return_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Return Date</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {format(new Date(item.return_date), 'MMMM dd, yyyy')}
                </p>
              </div>
            )}

            {item.admin_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.admin_notes}</p>
              </div>
            )}

            {!item.returned && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Return Notes</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="input mt-1"
                  rows={3}
                  placeholder="Add notes about the return..."
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onPrint}
                className="btn-primary flex items-center"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Details
              </button>
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
              {!item.returned && (
                <button
                  onClick={handleReturn}
                  className="btn-success"
                >
                  Mark as Returned
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function getStatusBadge(item: IssuedItem) {
    if (item.returned) {
      return <span className="badge-success">Returned</span>
    } else if (item.is_overdue) {
      return <span className="badge-danger">Overdue ({item.days_overdue} days)</span>
    } else {
      return <span className="badge-warning">Active</span>
    }
  }
}

export default IssuedItemsManagement

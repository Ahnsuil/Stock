import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AlertCircle, Search, Package, Calendar, User } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface DiscardedItem {
  id: string
  item_id: string
  quantity_discarded: number
  reason: 'damaged' | 'broken' | 'expired'
  discarded_by: string | null
  notes: string | null
  discarded_date: string
  stock_items: {
    name: string
    type: string
    batch_number: string | null
    expiry_date: string | null
    unit_type: string | null
  }
  users: {
    name: string
  } | null
}

const DiscardedItems: React.FC = () => {
  const [items, setItems] = useState<DiscardedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReason, setSelectedReason] = useState('')

  useEffect(() => {
    fetchDiscardedItems()
  }, [])

  const fetchDiscardedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('discarded_items')
        .select(`
          *,
          stock_items!inner(name, type, batch_number, expiry_date, unit_type),
          users(name)
        `)
        .order('discarded_date', { ascending: false })

      if (error) throw error
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching discarded items:', error)
      toast.error('Failed to load discarded items')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.stock_items.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.stock_items.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesReason = !selectedReason || item.reason === selectedReason
    return matchesSearch && matchesReason
  })

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'damaged':
        return <span className="badge-warning">Damaged</span>
      case 'broken':
        return <span className="badge-danger">Broken</span>
      case 'expired':
        return <span className="badge-gray">Expired</span>
      default:
        return <span className="badge-gray">{reason}</span>
    }
  }

  const totalDiscarded = filteredItems.reduce((sum, item) => sum + item.quantity_discarded, 0)

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discarded Items</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track items discarded due to damage, breakage, or expiry
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Items
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {filteredItems.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Quantity
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {totalDiscarded}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  This Month
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {filteredItems.filter(item => {
                    const itemDate = new Date(item.discarded_date)
                    const now = new Date()
                    return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
                  }).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search discarded items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="input"
          >
            <option value="">All Reasons</option>
            <option value="damaged">Damaged</option>
            <option value="broken">Broken</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Discarded Items Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Discarded By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.stock_items.name}
                        </div>
                        {item.stock_items.expiry_date && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Expiry: {format(new Date(item.stock_items.expiry_date), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="badge-primary">{item.stock_items.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.stock_items.batch_number || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="badge-danger">
                      {item.quantity_discarded} {item.stock_items.unit_type || 'pcs'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getReasonBadge(item.reason)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {item.users?.name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(item.discarded_date), 'MMM dd, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No discarded items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedReason
                ? 'Try adjusting your search filters.'
                : 'No items have been discarded yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiscardedItems
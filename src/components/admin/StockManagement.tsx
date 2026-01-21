import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Package, Edit, Trash2, Upload, ArrowUp, Pill, Box } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import type { StockCategory } from '../../lib/stockUtils'

interface StockItem {
  id: string
  name: string
  type: string
  quantity: number
  description: string | null
  purchase_vendor: string | null
  stock_category: StockCategory
  expiry_date: string | null
  batch_number: string | null
  created_at: string
  updated_at: string
}

const StockManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StockCategory>('general')
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [restockingItem, setRestockingItem] = useState<StockItem | null>(null)

  useEffect(() => {
    fetchStockItems()
  }, [activeTab])

  const fetchStockItems = async () => {
    setLoading(true)
    try {
      let q = supabase.from('stock_items').select('*').order('created_at', { ascending: false })
      q = q.eq('stock_category', activeTab)
      const { data, error } = await q

      if (error) {
        // If stock_category column is missing (migration not run), fetch all and filter in JS
        if (String(error.message || '').includes('stock_category') || String(error.code || '') === '42703') {
          const { data: allData, error: fallbackError } = await supabase
            .from('stock_items')
            .select('*')
            .order('created_at', { ascending: false })
          if (fallbackError) throw fallbackError
          const all = Array.isArray(allData) ? allData : []
          setItems(all.filter((r: { stock_category?: string }) => (r.stock_category || 'general') === activeTab))
        } else {
          throw error
        }
      } else {
        setItems(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching stock items:', error)
      toast.error('Failed to load stock items')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const safeItems = Array.isArray(items) ? items : []
  const filteredItems = safeItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !selectedType || item.type === selectedType
    const matchesLowStock = !showLowStockOnly || item.quantity <= 10
    return matchesSearch && matchesType && matchesLowStock
  })

  const uniqueTypes = Array.from(new Set(safeItems.map(item => item.type))).sort()

  // Check if an item is expiring within one month
  const isNearExpiry = (item: StockItem): boolean => {
    if (activeTab !== 'medical' || !item.expiry_date) return false
    
    const expiryDate = new Date(item.expiry_date)
    const today = new Date()
    const oneMonthFromNow = new Date()
    oneMonthFromNow.setMonth(today.getMonth() + 1)
    
    // Check if expiry date is within the next month and not already expired
    return expiryDate >= today && expiryDate <= oneMonthFromNow
  }

  const handleAddItem = async (formData: Omit<StockItem, 'id' | 'created_at' | 'updated_at'> & { batch_number?: string | null; expiry_date?: string | null; stock_category?: StockCategory }) => {
    try {
      const isMedical = formData.stock_category === 'medical'
      const dataToInsert: Record<string, unknown> = {
        name: formData.name,
        type: formData.type,
        quantity: formData.quantity,
        description: formData.description && String(formData.description).trim() ? String(formData.description).trim() : null,
        stock_category: isMedical ? 'medical' : 'general'
      }
      if (isMedical) {
        dataToInsert.batch_number = formData.batch_number?.trim() || null
        dataToInsert.expiry_date = formData.expiry_date || null
      }
      const { data, error } = await supabase
        .from('stock_items')
        .insert([dataToInsert])
        .select('id')
        .single()

      if (error) throw error

      if (formData.purchase_vendor && String(formData.purchase_vendor).trim() && data?.id) {
        await supabase
          .from('stock_items')
          .update({ purchase_vendor: String(formData.purchase_vendor).trim() })
          .eq('id', data.id)
      }

      toast.success('Stock item added successfully')
      fetchStockItems()
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding stock item:', error)
      toast.error('Failed to add stock item')
    }
  }

  const handleUpdateItem = async (formData: Omit<StockItem, 'id' | 'created_at' | 'updated_at'> & { batch_number?: string | null; expiry_date?: string | null }) => {
    if (!editingItem) return
    try {
      const { stock_category: _, ...updatePayload } = formData as typeof formData & { stock_category?: StockCategory }
      const payload: Record<string, unknown> = {
        name: updatePayload.name,
        type: updatePayload.type,
        quantity: updatePayload.quantity,
        description: updatePayload.description && String(updatePayload.description).trim() ? String(updatePayload.description).trim() : null,
        purchase_vendor: updatePayload.purchase_vendor && String(updatePayload.purchase_vendor).trim() ? String(updatePayload.purchase_vendor).trim() : null
      }
      if (editingItem.stock_category === 'medical') {
        payload.batch_number = (updatePayload as { batch_number?: string }).batch_number?.trim() || null
        payload.expiry_date = (updatePayload as { expiry_date?: string }).expiry_date || null
      }
      const { error } = await supabase
        .from('stock_items')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) throw error
      toast.success('Stock item updated successfully')
      fetchStockItems()
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating stock item:', error)
      toast.error('Failed to update stock item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Stock item deleted successfully')
      fetchStockItems()
    } catch (error) {
      console.error('Error deleting stock item:', error)
      toast.error('Failed to delete stock item')
    }
  }

  const handleRestockItem = async (itemId: string, quantityToAdd: number, purchaseVendor: string, notes: string) => {
    try {
      // First, get the current quantity
      const { data: currentItem, error: fetchError } = await supabase
        .from('stock_items')
        .select('quantity')
        .eq('id', itemId)
        .single()

      if (fetchError) throw fetchError

      // Calculate new quantity
      const newQuantity = currentItem.quantity + quantityToAdd

      // Update the stock quantity
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      // Record the purchase in history (optional - silently fail if table not accessible)
      // Fire and forget - don't await to avoid blocking or showing errors
      supabase
        .from('purchase_history')
        .insert({
          item_id: itemId,
          purchase_vendor: purchaseVendor || null,
          quantity_added: quantityToAdd,
          notes: notes || null
        })
        .then(({ error }) => {
          // Silently handle errors - purchase history is optional
          if (error) {
            // Suppress all errors - don't log or throw
            return
          }
        })
        .catch(() => {
          // Silently ignore any promise rejections
          // Stock was already updated successfully
        })
      
      toast.success(`Successfully added ${quantityToAdd} units to stock`)
      fetchStockItems()
      setShowRestockModal(false)
      setRestockingItem(null)
    } catch (error) {
      console.error('Error restocking item:', error)
      toast.error('Failed to restock item')
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your inventory items
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* General / Medical tabs - always visible in header */}
          <div className="inline-flex p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Box className="h-4 w-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium ${
                activeTab === 'medical'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Pill className="h-4 w-4" />
              Medical
            </button>
          </div>
          <button
            onClick={() => setShowBatchModal(true)}
            className="btn-secondary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Batch Upload
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input"
          >
            <option value="">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Low Stock Only (≤10)</span>
          </label>
        </div>
      </div>

      {/* Stock Items Table */}
      {loading ? (
        <div className="card flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : (
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
                {activeTab === 'medical' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Expiry
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => {
                const nearExpiry = isNearExpiry(item)
                return (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${nearExpiry ? 'animate-flash-red' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="badge-primary">{item.type}</span>
                  </td>
                  {activeTab === 'medical' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.batch_number || '—'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${nearExpiry ? 'font-bold text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                        {nearExpiry && (
                          <span className="ml-2 text-xs">⚠️ Expiring Soon</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${
                      item.quantity <= 10 ? 'badge-warning' :
                      item.quantity <= 5 ? 'badge-danger' : 'badge-success'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {item.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setRestockingItem(item)
                          setShowRestockModal(true)
                        }}
                        className="text-success-600 dark:text-success-400 hover:text-success-900 dark:hover:text-success-300"
                        title="Restock Item"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        title="Edit Item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-danger-600 dark:text-danger-400 hover:text-danger-900 dark:hover:text-danger-300"
                        title="Delete Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedType || showLowStockOnly
                ? 'Try adjusting your search filters.'
                : 'Get started by adding your first stock item.'
              }
            </p>
          </div>
        )}
      </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <StockItemModal
          item={editingItem}
          category={!editingItem ? activeTab : undefined}
          onSave={editingItem ? handleUpdateItem : handleAddItem}
          onClose={() => {
            setShowAddModal(false)
            setEditingItem(null)
          }}
        />
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <BatchUploadModal
          category={activeTab}
          onClose={() => setShowBatchModal(false)}
          onSuccess={() => {
            fetchStockItems()
            setShowBatchModal(false)
          }}
        />
      )}

      {/* Restock Modal */}
      {showRestockModal && restockingItem && (
        <RestockModal
          item={restockingItem}
          onRestock={handleRestockItem}
          onClose={() => {
            setShowRestockModal(false)
            setRestockingItem(null)
          }}
        />
      )}
    </div>
  )
}

// Stock Item Modal Component
interface StockItemModalProps {
  item?: StockItem | null
  category?: StockCategory
  onSave: (formData: Omit<StockItem, 'id' | 'created_at' | 'updated_at'> & { batch_number?: string | null; expiry_date?: string | null; stock_category?: StockCategory }) => void
  onClose: () => void
}

const StockItemModal: React.FC<StockItemModalProps> = ({ item, category, onSave, onClose }) => {
  const isMedical = item?.stock_category === 'medical' || category === 'medical'
  const [formData, setFormData] = useState({
    name: item?.name || '',
    type: item?.type || '',
    quantity: item?.quantity ?? 0,
    description: item?.description || '',
    purchase_vendor: item?.purchase_vendor || '',
    batch_number: item?.batch_number || '',
    expiry_date: item?.expiry_date ? String(item.expiry_date).slice(0, 10) : ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSave: Record<string, unknown> = {
      ...formData,
      description: formData.description?.trim() || null,
      purchase_vendor: formData.purchase_vendor?.trim() || null
    }
    if (isMedical) {
      dataToSave.batch_number = formData.batch_number?.trim() || null
      dataToSave.expiry_date = formData.expiry_date || null
      if (!item) dataToSave.stock_category = 'medical'
    }
    onSave(dataToSave as Parameters<typeof onSave>[0])
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 max-w-[calc(100vw-2rem)] shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {item ? 'Edit Stock Item' : `Add New ${isMedical ? 'Medical' : 'General'} Stock Item`}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder={isMedical ? 'e.g., Paracetamol, Bandages' : undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <input
                type="text"
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
                placeholder={isMedical ? 'e.g., Medication, First Aid' : 'e.g., Electronics, Stationery, Tools'}
              />
            </div>
            {isMedical && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch number *</label>
                  <input
                    type="text"
                    required
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="input"
                    placeholder="e.g., B2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="input"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Vendor</label>
              <input
                type="text"
                value={formData.purchase_vendor}
                onChange={(e) => setFormData({ ...formData, purchase_vendor: e.target.value })}
                className="input"
                placeholder="e.g., ABC Electronics, Office Supplies Co."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Optional description"
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
                {item ? 'Update' : 'Add'} Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Batch Upload Modal Component
interface BatchUploadModalProps {
  category: StockCategory
  onClose: () => void
  onSuccess: () => void
}

const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ category, onClose, onSuccess }) => {
  const [batchData, setBatchData] = useState('')
  const [loading, setLoading] = useState(false)
  const isMedical = category === 'medical'

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchData.trim()) return

    setLoading(true)
    try {
      const lines = batchData.trim().split('\n')
      const items = lines.map(line => {
        const parts = line.split(',').map(s => s.trim())
        if (isMedical) {
          const [name, type, quantity, description, purchase_vendor, batch_number, expiry_date] = parts
          return {
            name,
            type,
            quantity: parseInt(quantity) || 0,
            description: description || null,
            purchase_vendor: purchase_vendor || null,
            stock_category: 'medical' as const,
            batch_number: batch_number || null,
            expiry_date: expiry_date || null
          }
        }
        const [name, type, quantity, description, purchase_vendor] = parts
        return {
          name,
          type,
          quantity: parseInt(quantity) || 0,
          description: description || null,
          purchase_vendor: purchase_vendor || null,
          stock_category: 'general' as const
        }
      }).filter(it => it.name && it.type && (!isMedical || (it.batch_number && it.expiry_date)))

      if (items.length === 0) {
        toast.error(isMedical ? 'No valid items found. Each line must have: Name, Type, Qty, Description, Vendor, Batch, Expiry' : 'No valid items found in the input')
        return
      }

      const { error } = await supabase
        .from('stock_items')
        .insert(items)

      if (error) throw error

      toast.success(`Successfully added ${items.length} items`)
      onSuccess()
    } catch (error) {
      console.error('Error batch uploading:', error)
      toast.error('Failed to upload items')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[28rem] max-w-[calc(100vw-2rem)] shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Batch Upload {isMedical ? 'Medical' : 'General'} Stock Items
          </h3>
          <form onSubmit={handleBatchUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isMedical
                  ? 'Items (one per line: Name, Type, Quantity, Description, Purchase Vendor, Batch Number, Expiry YYYY-MM-DD)'
                  : 'Items (one per line: Name, Type, Quantity, Description, Purchase Vendor)'}
              </label>
              <textarea
                value={batchData}
                onChange={(e) => setBatchData(e.target.value)}
                className="input"
                rows={8}
                placeholder={isMedical
                  ? 'Paracetamol, Medication, 100, 500mg tablets, PharmaCo, B2024-001, 2025-12-31\nBandages, First Aid, 50, Elastic bandages, MedSupply, B2024-002, 2026-06-30'
                  : 'USB Drive, Electronics, 50, High-speed USB drives, TechStore Inc.\nNotebooks, Stationery, 100, A5 spiral notebooks, Office Supplies Co.\nScrewdrivers, Tools, 25, Multi-bit screwdriver set, Hardware Solutions'}
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
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <LoadingSpinner size="small" className="text-white mr-2" />
                ) : null}
                Upload Items
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Restock Modal Component
interface RestockModalProps {
  item: StockItem
  onRestock: (itemId: string, quantityToAdd: number, purchaseVendor: string, notes: string) => void
  onClose: () => void
}

const RestockModal: React.FC<RestockModalProps> = ({ item, onRestock, onClose }) => {
  const [formData, setFormData] = useState({
    quantityToAdd: '',
    purchaseVendor: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const quantity = parseInt(formData.quantityToAdd)
    if (quantity > 0) {
      onRestock(item.id, quantity, formData.purchaseVendor, formData.notes)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Restock Item
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{item.name} ({item.type})</p>
              {item.stock_category === 'medical' && (item.batch_number || item.expiry_date) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Batch: {item.batch_number || '—'} · Expiry: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">Current quantity: {item.quantity}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity to Add *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantityToAdd}
                onChange={(e) => setFormData({ ...formData, quantityToAdd: e.target.value })}
                className="input"
                placeholder="Enter quantity to add"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Vendor</label>
              <input
                type="text"
                value={formData.purchaseVendor}
                onChange={(e) => setFormData({ ...formData, purchaseVendor: e.target.value })}
                className="input"
                placeholder="e.g., ABC Electronics, Office Supplies Co."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Optional notes about this purchase"
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
                Add to Stock
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default StockManagement

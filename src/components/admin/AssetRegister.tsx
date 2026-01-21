import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Package, Plus, MapPin, Trash2, Edit, Calendar, DollarSign, Hash, Building } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Asset {
  id: string
  item_number: string
  item_name: string
  item_type: string
  purchase_date: string
  purchase_price: number
  current_location: string
  status: 'active' | 'discarded'
  discard_reason?: string
  discard_date?: string
  created_at: string
  updated_at: string
}

const AssetRegister: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [addingAsset, setAddingAsset] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Form states
  const [formData, setFormData] = useState({
    item_number: '',
    item_name: '',
    item_type: '',
    purchase_date: '',
    purchase_price: '',
    current_location: ''
  })
  const [discardReason, setDiscardReason] = useState('')

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist in PostgREST cache, show empty state gracefully
        if (error.code === '42P01') {
          console.warn('Assets table not found in PostgREST cache:', error)
          setAssets([])
          // Don't show error toast - just show empty state
        } else {
          throw error
        }
      } else {
        setAssets(data || [])
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
      // Only show error if it's not a "table doesn't exist" error
      if ((error as any)?.code !== '42P01') {
        toast.error('Failed to load assets')
      }
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (addingAsset) return // Prevent double submission
    
    // Client-side validation
    if (!formData.item_number.trim()) {
      toast.error('Item number is required')
      return
    }
    if (!formData.item_name.trim()) {
      toast.error('Item name is required')
      return
    }
    if (!formData.item_type.trim()) {
      toast.error('Item type is required')
      return
    }
    if (!formData.purchase_date) {
      toast.error('Purchase date is required')
      return
    }
    if (!formData.purchase_price || formData.purchase_price.trim() === '') {
      toast.error('Purchase price is required')
      return
    }
    const price = parseFloat(formData.purchase_price)
    if (isNaN(price) || price < 0) {
      toast.error('Purchase price must be a valid positive number')
      return
    }
    if (!formData.current_location.trim()) {
      toast.error('Current location is required')
      return
    }

    setAddingAsset(true)
    try {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          item_number: formData.item_number.trim(),
          item_name: formData.item_name.trim(),
          item_type: formData.item_type.trim(),
          purchase_date: formData.purchase_date,
          purchase_price: price,
          current_location: formData.current_location.trim()
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        if (error.code === '42P01') {
          toast.error('Assets table is not available. Please restart PostgREST service.')
        } else if (error.code === '23505') {
          toast.error(`Item number "${formData.item_number}" already exists. Please use a unique item number.`)
        } else if (error.code === '23502') {
          toast.error('Missing required field. Please fill in all required fields.')
        } else if (error.code === '23514') {
          toast.error('Invalid data format. Please check your input values.')
        } else {
          toast.error(`Failed to add asset: ${error.message || error.details || 'Unknown error'}`)
        }
        return
      }

      if (data && data.length > 0) {
        toast.success('Asset added successfully')
        setShowAddModal(false)
        setFormData({
          item_number: '',
          item_name: '',
          item_type: '',
          purchase_date: '',
          purchase_price: '',
          current_location: ''
        })
        fetchAssets()
      } else {
        toast.error('Asset was not created. Please try again.')
      }
    } catch (error: any) {
      console.error('Error adding asset:', error)
      toast.error(`Failed to add asset: ${error?.message || 'Unknown error'}`)
    } finally {
      setAddingAsset(false)
    }
  }

  const handleUpdateLocation = async (assetId: string, newLocation: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ 
          current_location: newLocation,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)

      if (error) {
        if (error.code === '42P01') {
          toast.error('Assets table is not available. Please restart PostgREST service.')
        } else {
          throw error
        }
        return
      }

      toast.success('Location updated successfully')
      fetchAssets()
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error('Failed to update location')
    }
  }

  const handleDiscardAsset = async () => {
    if (!selectedAsset || !discardReason.trim()) return

    try {
      const { error } = await supabase
        .from('assets')
        .update({
          status: 'discarded',
          discard_reason: discardReason,
          discard_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAsset.id)

      if (error) {
        if (error.code === '42P01') {
          toast.error('Assets table is not available. Please restart PostgREST service.')
        } else {
          throw error
        }
        return
      }

      toast.success('Asset discarded successfully')
      setShowDiscardModal(false)
      setSelectedAsset(null)
      setDiscardReason('')
      fetchAssets()
    } catch (error) {
      console.error('Error discarding asset:', error)
      toast.error('Failed to discard asset')
    }
  }

  const filteredAssets = assets.filter(asset => {
    const matchesFilter = selectedFilter === 'all' || asset.status === selectedFilter
    const matchesSearch = searchTerm === '' || 
      asset.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.current_location.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const activeAssetsCount = assets.filter(asset => asset.status === 'active').length
  const discardedAssetsCount = assets.filter(asset => asset.status === 'discarded').length
  const totalValue = assets
    .filter(asset => asset.status === 'active')
    .reduce((sum, asset) => sum + asset.purchase_price, 0)

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Register</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Keep track of all your organization's assets in one place!
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Asset
        </button>
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
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Assets
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {activeAssetsCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Trash2 className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Discarded Assets
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {discardedAssetsCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Value
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  MVR {totalValue.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building className="h-8 w-8 text-warning-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Assets
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {assets.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Assets</option>
            <option value="active">Active</option>
            <option value="discarded">Discarded</option>
          </select>
        </div>
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search assets by name, number, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Assets Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Asset Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Purchase Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Location
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
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {asset.item_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          #{asset.item_number} • {asset.item_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(asset.purchase_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center mt-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        MVR {asset.purchase_price.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{asset.current_location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {asset.status === 'active' ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="badge-secondary">Discarded</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {asset.status === 'active' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedAsset(asset)
                              setShowEditModal(true)
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            title="Change Location"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAsset(asset)
                              setShowDiscardModal(true)
                            }}
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-900 dark:hover:text-danger-300"
                            title="Discard Asset"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No assets found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first asset.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <AddAssetModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddAsset}
          onClose={() => setShowAddModal(false)}
          isSubmitting={addingAsset}
        />
      )}

      {/* Edit Location Modal */}
      {showEditModal && selectedAsset && (
        <EditLocationModal
          asset={selectedAsset}
          onUpdate={handleUpdateLocation}
          onClose={() => {
            setShowEditModal(false)
            setSelectedAsset(null)
          }}
        />
      )}

      {/* Discard Asset Modal */}
      {showDiscardModal && selectedAsset && (
        <DiscardAssetModal
          asset={selectedAsset}
          reason={discardReason}
          setReason={setDiscardReason}
          onDiscard={handleDiscardAsset}
          onClose={() => {
            setShowDiscardModal(false)
            setSelectedAsset(null)
            setDiscardReason('')
          }}
        />
      )}
    </div>
  )
}

// Add Asset Modal Component
interface AddAssetModalProps {
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  isSubmitting?: boolean
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ formData, setFormData, onSubmit, onClose, isSubmitting = false }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Add New Asset
          </h3>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Number *</label>
                <input
                  type="text"
                  required
                  value={formData.item_number}
                  onChange={(e) => setFormData({...formData, item_number: e.target.value})}
                  className="input mt-1"
                  placeholder="e.g., ASSET-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  className="input mt-1"
                  placeholder="e.g., Laptop Computer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Type *</label>
                <input
                  type="text"
                  required
                  value={formData.item_type}
                  onChange={(e) => setFormData({...formData, item_type: e.target.value})}
                  className="input mt-1"
                  placeholder="e.g., Electronics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date *</label>
                <input
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  className="input mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                  className="input mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Location *</label>
                <input
                  type="text"
                  required
                  value={formData.current_location}
                  onChange={(e) => setFormData({...formData, current_location: e.target.value})}
                  className="input mt-1"
                  placeholder="e.g., Office Building A, Room 101"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Edit Location Modal Component
interface EditLocationModalProps {
  asset: Asset
  onUpdate: (assetId: string, newLocation: string) => void
  onClose: () => void
}

const EditLocationModal: React.FC<EditLocationModalProps> = ({ asset, onUpdate, onClose }) => {
  const [newLocation, setNewLocation] = useState(asset.current_location)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(asset.id, newLocation)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-1/2 max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Change Asset Location
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{asset.item_name} (#{asset.item_number})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Location *</label>
              <input
                type="text"
                required
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="input mt-1"
                placeholder="Enter new location..."
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
                Update Location
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Discard Asset Modal Component
interface DiscardAssetModalProps {
  asset: Asset
  reason: string
  setReason: (reason: string) => void
  onDiscard: () => void
  onClose: () => void
}

const DiscardAssetModal: React.FC<DiscardAssetModalProps> = ({ 
  asset, 
  reason, 
  setReason, 
  onDiscard, 
  onClose 
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onDiscard()
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-1/2 max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Discard Asset
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{asset.item_name} (#{asset.item_number})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Discard *</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input mt-1"
                rows={3}
                placeholder="Enter reason for discarding this asset..."
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This action cannot be undone. The asset will be marked as discarded and removed from active inventory.
              </p>
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
                className="btn-danger"
                disabled={!reason.trim()}
              >
                Discard Asset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AssetRegister

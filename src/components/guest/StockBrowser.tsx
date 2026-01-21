import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Package, Search, ShoppingCart, Plus, Minus } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { getStockItemsWithAvailable, StockItemWithAvailable } from '../../lib/stockUtils'

interface StockItem {
  id: string
  name: string
  type: string
  quantity: number
  description: string | null
  batch_number: string | null
  expiry_date: string | null
  unit_type: 'box' | 'pcs' | null
  stock_category: 'general' | 'medical'
}

interface CartItem extends StockItem {
  requestQuantity: number
}

const StockBrowser: React.FC = () => {
  const { profile } = useAuth()
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [users, setUsers] = useState<Array<{ id: string; name: string; department: string | null }>>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    fetchStockItems()
    fetchUsers()
  }, [])

  const fetchStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .gt('quantity', 0) // Only show items with stock
        .order('name')

      if (error) throw error
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching stock items:', error)
      toast.error('Failed to load stock items')
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

      if (error) throw error
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const safeItems = Array.isArray(items) ? items : []
  
  // Get unique departments from users
  const uniqueDepartments = Array.from(new Set(users.map(u => u.department).filter(Boolean))).sort() as string[]
  
  const filteredItems = safeItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = !selectedType || item.type === selectedType
    // For department filter, we'll need to check if any user in that department has this item
    // For now, we'll filter by item type or show all if no department selected
    const matchesDepartment = !selectedDepartment || true // Placeholder - can be enhanced based on business logic
    return matchesSearch && matchesType && matchesDepartment
  })

  const uniqueTypes = Array.from(new Set(safeItems.map(item => item.type))).sort()

  const addToCart = (item: StockItem, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id)
      if (existingItem) {
        const newQuantity = Math.min(existingItem.requestQuantity + quantity, item.quantity)
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, requestQuantity: newQuantity }
            : cartItem
        )
      } else {
        return [...prevCart, { ...item, requestQuantity: Math.min(quantity, item.quantity) }]
      }
    })
  }

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(prevCart =>
      prevCart.map(cartItem => {
        if (cartItem.id === itemId) {
          const maxQuantity = safeItems.find(item => item.id === itemId)?.quantity || 0
          return { ...cartItem, requestQuantity: Math.min(quantity, maxQuantity) }
        }
        return cartItem
      })
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(cartItem => cartItem.id !== itemId))
  }

  const submitRequest = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (!profile) {
      toast.error('You must be logged in to submit a request')
      return
    }

    try {
      const requestItems = cart.map(item => ({
        item_id: item.id,
        quantity: item.requestQuantity,
        item_name: item.name
      }))

      const { error } = await supabase
        .from('requests')
        .insert([{
          user_id: profile.id,
          items: requestItems,
          status: 'pending'
        }])

      if (error) throw error

      toast.success('Request submitted successfully!')
      setCart([])
      setShowCart(false)
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request')
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.requestQuantity, 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Browse Stock</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse available items and add them to your request
          </p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="btn-primary relative"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart
          {cartTotal > 0 && (
            <span className="absolute -top-2 -right-2 bg-danger-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cartTotal}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
        <div className="w-full sm:w-48">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="input"
          >
            <option value="">All Departments</option>
            {uniqueDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Items Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-primary-600 mr-3" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500">{item.type}</p>
                </div>
              </div>
              <span className={`badge ${
                item.quantity <= 10 ? 'badge-warning' : 
                item.quantity <= 5 ? 'badge-danger' : 'badge-success'
              }`}>
                {item.quantity} {item.unit_type || 'pcs'}
              </span>
            </div>
            
            {item.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {item.description}
              </p>
            )}

            {(item.batch_number || item.expiry_date) && (
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                {item.batch_number && (
                  <div>Batch: {item.batch_number}</div>
                )}
                {item.expiry_date && (
                  <div>Expiry: {new Date(item.expiry_date).toLocaleDateString()}</div>
                )}
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Available: {item.quantity} {item.unit_type || 'pcs'}
              </div>
              <button
                onClick={() => addToCart(item)}
                className="btn-primary text-xs py-1 px-3"
                disabled={item.quantity === 0}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedType 
              ? 'Try adjusting your search filters.'
              : 'No stock items are currently available.'
            }
          </p>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Your Request Cart
              </h3>
              
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-500">{item.type}</p>
                          <p className="text-xs text-gray-400">Available: {item.quantity}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.requestQuantity - 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.requestQuantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.requestQuantity + 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            disabled={item.requestQuantity >= item.quantity}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-2 text-danger-600 hover:text-danger-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-900">
                        Total Items: {cartTotal}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowCart(false)}
                  className="btn-secondary"
                >
                  Continue Shopping
                </button>
                {cart.length > 0 && (
                  <button
                    onClick={submitRequest}
                    className="btn-primary"
                  >
                    Submit Request
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockBrowser

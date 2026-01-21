import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Package, Users, ClipboardList, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Plus, Eye, Clock, FileSpreadsheet } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import StockManagement from '../components/admin/StockManagement'
import RequestManagement from '../components/admin/RequestManagement'
import IssuedItemsManagement from '../components/admin/IssuedItemsManagement'
import AssetRegister from '../components/admin/AssetRegister'
import UserManagement from '../components/admin/UserManagement'
import ReportGenerator from '../components/admin/ReportGenerator'
import SiteSettings from '../components/admin/SiteSettings'

interface DashboardStats {
  totalItems: number
  totalRequests: number
  pendingRequests: number
  overdueItems: number
  totalUsers: number
  lowStockItems: number
  fastMovingItems: Array<{
    id: string
    name: string
    type: string
    totalRequested: number
    requestCount: number
  }>
  lowStockItemsList: Array<{
    id: string
    name: string
    type: string
    quantity: number
  }>
  overdueItemsList: Array<{
    id: string
    item_name: string
    item_type: string
    user_name: string
    user_email: string
    quantity_issued: number
    return_due: string
    days_overdue: number
  }>
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const [stockResult, requestsResult, issuedResult, usersResult] = await Promise.all([
        supabase.from('stock_items').select('id, name, type, quantity'),
        supabase.from('requests').select('id, status, items'),
        supabase.from('issued_items').select(`
          id, 
          item_id, 
          user_id, 
          quantity_issued, 
          return_due, 
          returned,
          stock_items!inner(name, type),
          users!inner(name, email)
        `),
        supabase.from('users').select('id')
      ])

      const stockItems = Array.isArray(stockResult.data) ? stockResult.data : []
      const requests = Array.isArray(requestsResult.data) ? requestsResult.data : []
      const issuedItems = Array.isArray(issuedResult.data) ? issuedResult.data : []
      const users = Array.isArray(usersResult.data) ? usersResult.data : []

      // Calculate fast-moving items
      const itemRequestCounts: { [key: string]: { totalRequested: number, requestCount: number, name: string, type: string } } = {}
      
      requests.forEach(request => {
        if (request.items && Array.isArray(request.items)) {
          request.items.forEach((item: any) => {
            if (item.item_id && item.quantity) {
              if (!itemRequestCounts[item.item_id]) {
                itemRequestCounts[item.item_id] = {
                  totalRequested: 0,
                  requestCount: 0,
                  name: item.item_name || 'Unknown',
                  type: 'Unknown'
                }
              }
              itemRequestCounts[item.item_id].totalRequested += item.quantity
              itemRequestCounts[item.item_id].requestCount += 1
            }
          })
        }
      })

      // Get item details for fast-moving items
      const fastMovingItems = Object.entries(itemRequestCounts)
        .map(([itemId, data]) => {
          const stockItem = stockItems.find(item => item.id === itemId)
          return {
            id: itemId,
            name: stockItem?.name || data.name,
            type: stockItem?.type || data.type,
            totalRequested: data.totalRequested,
            requestCount: data.requestCount
          }
        })
        .sort((a, b) => b.totalRequested - a.totalRequested)
        .slice(0, 4) // Top 4 fast-moving items

      // Get low stock items
      const lowStockItemsList = stockItems
        .filter(item => item.quantity <= 10)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 4) // Latest 4 low stock items

      // Get overdue items (return due date has passed)
      const now = new Date()
      const overdueItemsList = issuedItems
        .filter(item => {
          const returnDue = new Date(item.return_due)
          return !item.returned && returnDue < now
        })
        .map(item => {
          const returnDue = new Date(item.return_due)
          const daysOverdue = Math.floor((now.getTime() - returnDue.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: item.id,
            item_name: item.stock_items.name,
            item_type: item.stock_items.type,
            user_name: item.users.name,
            user_email: item.users.email,
            quantity_issued: item.quantity_issued,
            return_due: item.return_due,
            days_overdue: daysOverdue
          }
        })
        .sort((a, b) => b.days_overdue - a.days_overdue) // Most overdue first
        .slice(0, 4) // Latest 4 overdue items

      setStats({
        totalItems: stockItems.length,
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        overdueItems: overdueItemsList.length,
        totalUsers: users.length,
        lowStockItems: lowStockItemsList.length,
        fastMovingItems,
        lowStockItemsList,
        overdueItemsList
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const DashboardOverview = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your stock management system
        </p>
      </div>

      {/* Quick Actions Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Manage your inventory efficiently</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Add Stock Button */}
          <button
            onClick={() => navigate('/stock')}
            className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-700 transition-colors">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Add Stock</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Add new items</p>
              </div>
            </div>
          </button>

          {/* View Requests Button */}
          <button
            onClick={() => navigate('/requests')}
            className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg group-hover:bg-yellow-200 dark:group-hover:bg-yellow-700 transition-colors">
                <ClipboardList className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">View Requests</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stats?.pendingRequests || 0} pending</p>
              </div>
            </div>
          </button>

          {/* Manage Issued Items Button */}
          <button
            onClick={() => navigate('/issued')}
            className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-700 transition-colors">
                <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Issued Items</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stats?.overdueItems || 0} overdue</p>
              </div>
            </div>
          </button>

          {/* Asset Register Button */}
          <button
            onClick={() => navigate('/assets')}
            className="flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-700 transition-colors">
                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Asset Register</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Track assets</p>
              </div>
            </div>
          </button>

          {/* Manage Users Button */}
          <button
            onClick={() => navigate('/users')}
            className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-700 transition-colors">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Manage Users</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stats?.totalUsers || 0} total users</p>
              </div>
            </div>
          </button>

          {/* Generate Report Button */}
          <button
            onClick={() => navigate('/report')}
            className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-700 transition-colors">
                <FileSpreadsheet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Generate Report</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Excel export</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Stock Items */}
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Stock Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.totalItems || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.pendingRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Overdue Items */}
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-danger-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overdue Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.overdueItems || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.totalUsers || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Low Stock Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.lowStockItems || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Total Requests */}
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats?.totalRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fast Moving Items */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Fast Moving Items</h3>
              <span className="badge-primary">Top 4</span>
            </div>
            {stats.fastMovingItems.length > 0 ? (
              <div className="space-y-3">
                {stats.fastMovingItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">#{index + 1}</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.totalRequested} requested</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.requestCount} times</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No request data available</p>
              </div>
            )}
          </div>

          {/* Low Stock Items */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Low Stock Items</h3>
              <span className="badge-warning">Latest 4</span>
            </div>
            {stats.lowStockItemsList.length > 0 ? (
              <div className="space-y-3">
                {stats.lowStockItemsList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        item.quantity <= 5 ? 'text-red-600 dark:text-red-400' : 
                        item.quantity <= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.quantity} left
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.quantity <= 5 ? 'Critical' : 'Low stock'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">All items are well stocked</p>
              </div>
            )}
          </div>

          {/* Overdue Items */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Overdue Returns</h3>
              <span className="badge-danger">Latest 4</span>
            </div>
            {stats.overdueItemsList.length > 0 ? (
              <div className="space-y-3">
                {stats.overdueItemsList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.item_type} • {item.user_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{item.days_overdue} days overdue</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Due: {new Date(item.return_due).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {stats.overdueItemsList.length > 4 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      +{stats.overdueItemsList.length - 4} more overdue items
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No overdue returns</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/stock" element={<StockManagement />} />
        <Route path="/requests" element={<RequestManagement />} />
        <Route path="/issued" element={<IssuedItemsManagement />} />
        <Route path="/assets" element={<AssetRegister />} />
        <Route path="/report" element={<ReportGenerator />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/site-settings" element={<SiteSettings />} />
      </Routes>
    </Layout>
  )
}

export default AdminDashboard

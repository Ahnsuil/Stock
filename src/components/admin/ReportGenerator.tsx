import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Download, FileSpreadsheet, Calendar, User, Package, CheckCircle, AlertTriangle, Building, DollarSign } from 'lucide-react'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'

interface ReportData {
  issuedItems: {
    id: string
    item_name: string
    item_type: string
    quantity_issued: number
    issued_date: string
    return_due: string
    returned: boolean
    return_date: string | null
    user_name: string
    user_email: string
    admin_notes: string | null
    current_stock_balance: number
    approved_by: string
  }[]
  stockItems: {
    id: string
    name: string
    type: string
    quantity: number
    description: string | null
    purchase_vendor: string | null
  }[]
  assets: {
    id: string
    item_number: string
    item_name: string
    item_type: string
    purchase_date: string
    purchase_price: number
    current_location: string
    status: string
    discard_reason?: string
    discard_date?: string
  }[]
  purchaseHistory: {
    id: string
    item_name: string
    item_type: string
    purchase_vendor: string | null
    quantity_added: number
    purchase_date: string
    notes: string | null
  }[]
}

const ReportGenerator: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [itemDetailData, setItemDetailData] = useState<any>(null)
  const [showItemDetail, setShowItemDetail] = useState(false)
  const [stockItems, setStockItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    // Set default date range to last 30 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })

    // Load stock items for item selection
    fetchStockItems()
  }, [])

  const fetchStockItems = async () => {
    setLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name')

      if (error) throw error
      setStockItems(data || [])
    } catch (error) {
      console.error('Error fetching stock items:', error)
      toast.error('Failed to load stock items')
    } finally {
      setLoadingItems(false)
    }
  }

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Fetch issued items with all related data
      const { data: issuedItemsData, error: issuedError } = await supabase
        .from('issued_items')
        .select(`
          *,
          stock_items!inner(name, type, quantity),
          users!inner(name, email)
        `)
        .gte('issued_date', dateRange.startDate)
        .lte('issued_date', dateRange.endDate)
        .order('issued_date', { ascending: false })

      if (issuedError) throw issuedError

      // Fetch all stock items for balance information
      const { data: stockItemsData, error: stockError } = await supabase
        .from('stock_items')
        .select('*')
        .order('name')

      if (stockError) throw stockError

      // Fetch all assets (optional - continue if table doesn't exist in PostgREST cache)
      let assetsData = []
      try {
        const { data, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (assetsError) {
          console.warn('Could not fetch assets (table may not be in PostgREST cache):', assetsError)
        } else {
          assetsData = data || []
        }
      } catch (error) {
        console.warn('Error fetching assets:', error)
        // Continue without assets data
      }

      // Fetch purchase history (optional - continue if table doesn't exist in PostgREST cache)
      let purchaseHistoryData = []
      try {
        // Try simple query first (PostgREST may not see the relationship)
        const { data: purchaseData, error: simpleError } = await supabase
          .from('purchase_history')
          .select('*')
          .gte('purchase_date', dateRange.startDate)
          .lte('purchase_date', dateRange.endDate)
          .order('purchase_date', { ascending: false })
        
        if (simpleError) {
          console.warn('Could not fetch purchase history (table may not be in PostgREST cache):', simpleError)
        } else if (purchaseData && purchaseData.length > 0) {
          // Fetch stock item names separately since join may not work
          const itemIds = [...new Set(purchaseData.map(p => p.item_id).filter(Boolean))]
          if (itemIds.length > 0) {
            const { data: stockItems } = await supabase
              .from('stock_items')
              .select('id, name, type')
              .in('id', itemIds)
            
            const stockItemsMap = new Map(stockItems?.map(item => [item.id, item]) || [])
            
            // Combine purchase history with stock item data
            purchaseHistoryData = purchaseData.map(purchase => ({
              ...purchase,
              stock_items: stockItemsMap.get(purchase.item_id) || { name: 'Unknown', type: 'Unknown' }
            }))
          } else {
            purchaseHistoryData = purchaseData.map(purchase => ({
              ...purchase,
              stock_items: { name: 'Unknown', type: 'Unknown' }
            }))
          }
        }
      } catch (error) {
        console.warn('Error fetching purchase history:', error)
        // Continue without purchase history data
      }

      // Process issued items data
      const processedIssuedItems = (issuedItemsData || []).map(item => ({
        id: item.id,
        item_name: item.stock_items.name,
        item_type: item.stock_items.type,
        quantity_issued: item.quantity_issued,
        issued_date: item.issued_date,
        return_due: item.return_due,
        returned: item.returned,
        return_date: item.return_date,
        user_name: item.users.name,
        user_email: item.users.email,
        admin_notes: item.admin_notes,
        current_stock_balance: item.stock_items.quantity,
        approved_by: 'Admin' // Since we don't track who approved, defaulting to Admin
      }))

      // Process purchase history data
      const processedPurchaseHistory = (purchaseHistoryData || []).map(purchase => ({
        id: purchase.id,
        item_name: purchase.stock_items.name,
        item_type: purchase.stock_items.type,
        purchase_vendor: purchase.purchase_vendor,
        quantity_added: purchase.quantity_added,
        purchase_date: purchase.purchase_date,
        notes: purchase.notes
      }))

      setReportData({
        issuedItems: processedIssuedItems,
        stockItems: stockItemsData || [],
        assets: assetsData || [],
        purchaseHistory: processedPurchaseHistory
      })

      toast.success('Report data loaded successfully')
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const fetchItemDetailReport = async () => {
    if (!selectedItem) {
      toast.error('Please select an item')
      return
    }

    setLoading(true)
    try {
      // Fetch item details
      const { data: itemData, error: itemError } = await supabase
        .from('stock_items')
        .select('*')
        .eq('id', selectedItem)
        .single()

      if (itemError) throw itemError

      // Fetch purchase history for this item (optional - continue if table doesn't exist in PostgREST cache)
      let purchaseHistory = []
      try {
        const { data, error: purchaseError } = await supabase
          .from('purchase_history')
          .select('*')
          .eq('item_id', selectedItem)
          .order('purchase_date', { ascending: false })
        
        if (purchaseError) {
          console.warn('Could not fetch purchase history (table may not be in PostgREST cache):', purchaseError)
        } else {
          purchaseHistory = data || []
        }
      } catch (error) {
        console.warn('Error fetching purchase history:', error)
        // Continue without purchase history data
      }

      // Fetch issued items for this item
      const { data: issuedItems, error: issuedError } = await supabase
        .from('issued_items')
        .select(`
          *,
          users!inner(name, email),
          requests!inner(status, admin_notes)
        `)
        .eq('item_id', selectedItem)
        .order('issued_date', { ascending: false })

      if (issuedError) throw issuedError

      // Process the data
      const processedData = {
        item: itemData,
        purchaseHistory: purchaseHistory || [],
        issuedItems: (issuedItems || []).map(issue => ({
          id: issue.id,
          quantity_issued: issue.quantity_issued,
          issued_date: issue.issued_date,
          return_due: issue.return_due,
          returned: issue.returned,
          return_date: issue.return_date,
          user_name: issue.users.name,
          user_email: issue.users.email,
          request_status: issue.requests.status,
          admin_notes: issue.admin_notes
        }))
      }

      setItemDetailData(processedData)
      setShowItemDetail(true)
      toast.success('Item detail report loaded successfully')
    } catch (error) {
      console.error('Error fetching item detail:', error)
      toast.error('Failed to load item detail report')
    } finally {
      setLoading(false)
    }
  }

  const generateItemDetailExcel = () => {
    if (!itemDetailData) {
      toast.error('No item detail data available')
      return
    }

    try {
      const workbook = XLSX.utils.book_new()

      // 1. Item Overview
      const itemOverview = [{
        'Item Name': itemDetailData.item.name,
        'Item Type': itemDetailData.item.type,
        'Current Quantity': itemDetailData.item.quantity,
        'Description': itemDetailData.item.description || 'No description',
        'Primary Vendor': itemDetailData.item.purchase_vendor || 'Not specified',
        'Created Date': format(new Date(itemDetailData.item.created_at), 'MMM dd, yyyy'),
        'Last Updated': format(new Date(itemDetailData.item.updated_at), 'MMM dd, yyyy')
      }]

      const itemOverviewWS = XLSX.utils.json_to_sheet(itemOverview)
      XLSX.utils.book_append_sheet(workbook, itemOverviewWS, 'Item Overview')

      // 2. Purchase History
      const purchaseHistorySheet = itemDetailData.purchaseHistory.map((purchase: any, index: number) => ({
        'Purchase #': index + 1,
        'Purchase Date': format(new Date(purchase.purchase_date), 'MMM dd, yyyy'),
        'Purchase Time': format(new Date(purchase.purchase_date), 'HH:mm:ss'),
        'Vendor': purchase.purchase_vendor || 'Not specified',
        'Quantity Added': purchase.quantity_added,
        'Notes': purchase.notes || 'No notes',
        'Cumulative Quantity': itemDetailData.purchaseHistory.slice(0, index + 1).reduce((sum: number, p: any) => sum + p.quantity_added, 0)
      }))

      const purchaseHistoryWS = XLSX.utils.json_to_sheet(purchaseHistorySheet)
      XLSX.utils.book_append_sheet(workbook, purchaseHistoryWS, 'Purchase History')

      // 3. Issued Items History
      const issuedItemsSheet = itemDetailData.issuedItems.map((issue: any) => ({
        'Issued Date': format(new Date(issue.issued_date), 'MMM dd, yyyy'),
        'Quantity Issued': issue.quantity_issued,
        'Issued To': issue.user_name,
        'User Email': issue.user_email,
        'Return Due': format(new Date(issue.return_due), 'MMM dd, yyyy'),
        'Status': issue.returned ? 'Returned' : 'Active',
        'Return Date': issue.return_date ? format(new Date(issue.return_date), 'MMM dd, yyyy') : 'N/A',
        'Request Status': issue.request_status,
        'Admin Notes': issue.admin_notes || 'No notes'
      }))

      const issuedItemsWS = XLSX.utils.json_to_sheet(issuedItemsSheet)
      XLSX.utils.book_append_sheet(workbook, issuedItemsWS, 'Issued Items History')

      // 4. Summary Statistics
      const totalPurchased = itemDetailData.purchaseHistory.reduce((sum: number, p: any) => sum + p.quantity_added, 0)
      const totalIssued = itemDetailData.issuedItems.reduce((sum: number, i: any) => sum + i.quantity_issued, 0)
      const uniqueVendors = new Set(itemDetailData.purchaseHistory.map((p: any) => p.purchase_vendor).filter(Boolean)).size
      const uniqueUsers = new Set(itemDetailData.issuedItems.map((i: any) => i.user_email)).size

      const summaryData = [
        { 'Metric': 'Current Stock', 'Value': itemDetailData.item.quantity },
        { 'Metric': 'Total Purchased', 'Value': totalPurchased },
        { 'Metric': 'Total Issued', 'Value': totalIssued },
        { 'Metric': 'Net Movement', 'Value': totalPurchased - totalIssued },
        { 'Metric': 'Purchase Transactions', 'Value': itemDetailData.purchaseHistory.length },
        { 'Metric': 'Issue Transactions', 'Value': itemDetailData.issuedItems.length },
        { 'Metric': 'Unique Vendors', 'Value': uniqueVendors },
        { 'Metric': 'Unique Users', 'Value': uniqueUsers },
        { 'Metric': 'Active Issues', 'Value': itemDetailData.issuedItems.filter((i: any) => !i.returned).length },
        { 'Metric': 'Returned Issues', 'Value': itemDetailData.issuedItems.filter((i: any) => i.returned).length }
      ]

      const summaryWS = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary Statistics')

      // Generate filename
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
      const filename = `Item_Detail_${itemDetailData.item.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`

      XLSX.writeFile(workbook, filename)
      toast.success('Item detail Excel report generated successfully!')
    } catch (error) {
      console.error('Error generating item detail Excel report:', error)
      toast.error('Failed to generate item detail Excel report')
    }
  }

  const generateExcelReport = () => {
    if (!reportData) {
      toast.error('No data available to export')
      return
    }

    try {
      // Create workbook
      const workbook = XLSX.utils.book_new()

      // 1. Issued Items Report
      const issuedItemsSheet = reportData.issuedItems.map(item => ({
        'Item Name': item.item_name,
        'Item Type': item.item_type,
        'Quantity Issued': item.quantity_issued,
        'Issued Date': format(new Date(item.issued_date), 'MMM dd, yyyy'),
        'Return Due': format(new Date(item.return_due), 'MMM dd, yyyy'),
        'Status': item.returned ? 'Returned' : 'Active',
        'Return Date': item.return_date ? format(new Date(item.return_date), 'MMM dd, yyyy') : 'N/A',
        'Issued To': item.user_name,
        'User Email': item.user_email,
        'Current Stock Balance': item.current_stock_balance,
        'Approved By': item.approved_by,
        'Admin Notes': item.admin_notes || 'N/A'
      }))

      const issuedItemsWS = XLSX.utils.json_to_sheet(issuedItemsSheet)
      XLSX.utils.book_append_sheet(workbook, issuedItemsWS, 'Issued Items Report')

      // 2. Stock Balance Report
      const stockBalanceSheet = reportData.stockItems.map(item => ({
        'Item Name': item.name,
        'Item Type': item.type,
        'Current Quantity': item.quantity,
        'Description': item.description || 'No description',
        'Primary Purchase Vendor': item.purchase_vendor || 'Not Specified',
        'Vendor Status': item.purchase_vendor ? 'Vendor Recorded' : 'No Vendor Info'
      }))

      const stockBalanceWS = XLSX.utils.json_to_sheet(stockBalanceSheet)
      XLSX.utils.book_append_sheet(workbook, stockBalanceWS, 'Stock Balance Report')

      // 3. Asset Register Report
      const assetRegisterSheet = reportData.assets.map(asset => ({
        'Item Number': asset.item_number,
        'Item Name': asset.item_name,
        'Item Type': asset.item_type,
        'Purchase Date': format(new Date(asset.purchase_date), 'MMM dd, yyyy'),
        'Purchase Price (MVR)': asset.purchase_price,
        'Current Location': asset.current_location,
        'Status': asset.status === 'active' ? 'Active' : 'Discarded',
        'Discard Reason': asset.discard_reason || 'N/A',
        'Discard Date': asset.discard_date ? format(new Date(asset.discard_date), 'MMM dd, yyyy') : 'N/A'
      }))

      const assetRegisterWS = XLSX.utils.json_to_sheet(assetRegisterSheet)
      XLSX.utils.book_append_sheet(workbook, assetRegisterWS, 'Asset Register Report')

      // 4. Purchase History Report
      const purchaseHistorySheet = reportData.purchaseHistory.map(purchase => ({
        'Item Name': purchase.item_name,
        'Item Type': purchase.item_type,
        'Purchase Vendor': purchase.purchase_vendor || 'Not Specified',
        'Quantity Added': purchase.quantity_added,
        'Purchase Date': format(new Date(purchase.purchase_date), 'MMM dd, yyyy'),
        'Purchase Time': format(new Date(purchase.purchase_date), 'HH:mm:ss'),
        'Notes': purchase.notes || 'No notes',
        'Vendor Status': purchase.purchase_vendor ? 'Vendor Specified' : 'No Vendor'
      }))

      const purchaseHistoryWS = XLSX.utils.json_to_sheet(purchaseHistorySheet)
      XLSX.utils.book_append_sheet(workbook, purchaseHistoryWS, 'Purchase History Report')

      // 5. Vendor Analysis Report
      const vendorAnalysis = reportData.purchaseHistory.reduce((acc, purchase) => {
        const vendor = purchase.purchase_vendor || 'Not Specified'
        if (!acc[vendor]) {
          acc[vendor] = {
            vendor: vendor,
            totalPurchases: 0,
            totalQuantity: 0,
            items: new Set(),
            lastPurchase: purchase.purchase_date
          }
        }
        acc[vendor].totalPurchases++
        acc[vendor].totalQuantity += purchase.quantity_added
        acc[vendor].items.add(purchase.item_name)
        if (new Date(purchase.purchase_date) > new Date(acc[vendor].lastPurchase)) {
          acc[vendor].lastPurchase = purchase.purchase_date
        }
        return acc
      }, {} as Record<string, any>)

      const vendorAnalysisSheet = Object.values(vendorAnalysis).map((vendor: any) => ({
        'Vendor Name': vendor.vendor,
        'Total Purchases': vendor.totalPurchases,
        'Total Quantity Purchased': vendor.totalQuantity,
        'Unique Items': vendor.items.size,
        'Last Purchase Date': format(new Date(vendor.lastPurchase), 'MMM dd, yyyy'),
        'Average Quantity per Purchase': Math.round(vendor.totalQuantity / vendor.totalPurchases * 100) / 100
      }))

      const vendorAnalysisWS = XLSX.utils.json_to_sheet(vendorAnalysisSheet)
      XLSX.utils.book_append_sheet(workbook, vendorAnalysisWS, 'Vendor Analysis Report')

      // 6. Item Purchase History Report (Detailed by Item)
      const itemPurchaseHistory = reportData.purchaseHistory.reduce((acc, purchase) => {
        const itemKey = `${purchase.item_name} (${purchase.item_type})`
        if (!acc[itemKey]) {
          acc[itemKey] = []
        }
        acc[itemKey].push(purchase)
        return acc
      }, {} as Record<string, any[]>)

      const itemPurchaseHistorySheet = Object.entries(itemPurchaseHistory).flatMap(([itemName, purchases]) => {
        const sortedPurchases = purchases.sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())
        return sortedPurchases.map((purchase, index) => ({
          'Item Name': index === 0 ? itemName : '',
          'Purchase #': index + 1,
          'Purchase Vendor': purchase.purchase_vendor || 'Not Specified',
          'Quantity Added': purchase.quantity_added,
          'Purchase Date': format(new Date(purchase.purchase_date), 'MMM dd, yyyy'),
          'Purchase Time': format(new Date(purchase.purchase_date), 'HH:mm:ss'),
          'Notes': purchase.notes || 'No notes',
          'Vendor Change': index > 0 && purchase.purchase_vendor !== sortedPurchases[index - 1].purchase_vendor ? 'YES - Different Vendor' : index === 0 ? 'Initial Purchase' : 'Same Vendor'
        }))
      })

      if (itemPurchaseHistorySheet.length > 0) {
        const itemPurchaseHistoryWS = XLSX.utils.json_to_sheet(itemPurchaseHistorySheet)
        XLSX.utils.book_append_sheet(workbook, itemPurchaseHistoryWS, 'Item Purchase History')
      }

      // 7. Summary Report
      const totalIssued = reportData.issuedItems.reduce((sum, item) => sum + item.quantity_issued, 0)
      const totalReturned = reportData.issuedItems.filter(item => item.returned).length
      const totalActive = reportData.issuedItems.filter(item => !item.returned).length
      const totalOverdue = reportData.issuedItems.filter(item => 
        !item.returned && new Date(item.return_due) < new Date()
      ).length

      // Calculate asset statistics
      const totalAssets = reportData.assets.length
      const activeAssets = reportData.assets.filter(asset => asset.status === 'active').length
      const discardedAssets = reportData.assets.filter(asset => asset.status === 'discarded').length
      const totalAssetValue = reportData.assets
        .filter(asset => asset.status === 'active')
        .reduce((sum, asset) => sum + asset.purchase_price, 0)

      // Calculate purchase history statistics
      const totalPurchases = reportData.purchaseHistory.length
      const totalQuantityPurchased = reportData.purchaseHistory.reduce((sum, purchase) => sum + purchase.quantity_added, 0)
      const uniqueVendors = new Set(reportData.purchaseHistory.map(p => p.purchase_vendor).filter(Boolean)).size
      const purchasesWithVendor = reportData.purchaseHistory.filter(p => p.purchase_vendor).length
      const purchasesWithoutVendor = reportData.purchaseHistory.filter(p => !p.purchase_vendor).length
      const vendorChangeCount = reportData.purchaseHistory.filter((purchase, index, arr) => {
        if (index === 0) return false
        const prevPurchase = arr[index - 1]
        return prevPurchase && purchase.purchase_vendor !== prevPurchase.purchase_vendor
      }).length

      const summaryData = [
        { 'Metric': 'Total Items Issued', 'Value': totalIssued },
        { 'Metric': 'Total Transactions', 'Value': reportData.issuedItems.length },
        { 'Metric': 'Returned Items', 'Value': totalReturned },
        { 'Metric': 'Active Items', 'Value': totalActive },
        { 'Metric': 'Overdue Items', 'Value': totalOverdue },
        { 'Metric': 'Total Assets', 'Value': totalAssets },
        { 'Metric': 'Active Assets', 'Value': activeAssets },
        { 'Metric': 'Discarded Assets', 'Value': discardedAssets },
        { 'Metric': 'Total Asset Value (MVR)', 'Value': totalAssetValue },
        { 'Metric': 'Purchase Transactions', 'Value': totalPurchases },
        { 'Metric': 'Total Quantity Purchased', 'Value': totalQuantityPurchased },
        { 'Metric': 'Unique Vendors', 'Value': uniqueVendors },
        { 'Metric': 'Purchases with Vendor Info', 'Value': purchasesWithVendor },
        { 'Metric': 'Purchases without Vendor Info', 'Value': purchasesWithoutVendor },
        { 'Metric': 'Vendor Change Instances', 'Value': vendorChangeCount },
        { 'Metric': 'Vendor Coverage %', 'Value': totalPurchases > 0 ? Math.round((purchasesWithVendor / totalPurchases) * 100) + '%' : '0%' },
        { 'Metric': 'Report Period', 'Value': `${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} - ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}` },
        { 'Metric': 'Generated On', 'Value': format(new Date(), 'MMM dd, yyyy HH:mm') }
      ]

      const summaryWS = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary Report')

      // 5. Returned Items Report
      const returnedItems = reportData.issuedItems.filter(item => item.returned)
      const returnedItemsSheet = returnedItems.map(item => ({
        'Item Name': item.item_name,
        'Item Type': item.item_type,
        'Quantity Returned': item.quantity_issued,
        'Issued Date': format(new Date(item.issued_date), 'MMM dd, yyyy'),
        'Return Date': format(new Date(item.return_date!), 'MMM dd, yyyy'),
        'Returned By': item.user_name,
        'User Email': item.user_email,
        'Admin Notes': item.admin_notes || 'N/A'
      }))

      if (returnedItemsSheet.length > 0) {
        const returnedItemsWS = XLSX.utils.json_to_sheet(returnedItemsSheet)
        XLSX.utils.book_append_sheet(workbook, returnedItemsWS, 'Returned Items Report')
      }

      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
      const filename = `Stock_Report_${timestamp}.xlsx`

      // Save file
      XLSX.writeFile(workbook, filename)
      toast.success('Excel report generated successfully!')
    } catch (error) {
      console.error('Error generating Excel report:', error)
      toast.error('Failed to generate Excel report')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Generator</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate comprehensive Excel reports for issued items, stock balances, asset register, and returns
          </p>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Report Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="btn-primary flex items-center"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Loading Data...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Load Report Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Item Detail Report */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Detailed Item Report</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Generate a comprehensive report for a specific item showing all purchase history, who requested it, vendor details, and complete transaction history.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="input"
              disabled={loadingItems}
            >
              <option value="">
                {loadingItems ? 'Loading items...' : 'Choose an item...'}
              </option>
              {stockItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.type}) - Qty: {item.quantity}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={fetchStockItems}
              disabled={loadingItems}
              className="btn-secondary flex items-center"
            >
              {loadingItems ? (
                <>
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Refresh Items
                </>
              )}
            </button>
            <button
              onClick={fetchItemDetailReport}
              disabled={loading || !selectedItem}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generate Item Detail Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Report Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-primary-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.issuedItems.reduce((sum, item) => sum + item.quantity_issued, 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-success-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Returned</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.issuedItems.filter(item => item.returned).length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-warning-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.issuedItems.filter(item => !item.returned).length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-danger-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.issuedItems.filter(item => 
                        !item.returned && new Date(item.return_due) < new Date()
                      ).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Asset Summary */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Asset Register Summary</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card">
                  <div className="flex items-center">
                    <Building className="h-8 w-8 text-indigo-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assets</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {reportData.assets.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Assets</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {reportData.assets.filter(asset => asset.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-gray-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Discarded</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {reportData.assets.filter(asset => asset.status === 'discarded').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-success-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        MVR {reportData.assets
                          .filter(asset => asset.status === 'active')
                          .reduce((sum, asset) => sum + asset.purchase_price, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Export Options</h3>
            <div className="card">
              <div className="space-y-4">
                <div className="flex items-center">
                  <FileSpreadsheet className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Comprehensive Excel Report
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Includes issued items, stock balances, asset register, detailed purchase history with vendor tracking, vendor analysis, item purchase history, returned items, and comprehensive summary statistics
                </p>
                <button
                  onClick={generateExcelReport}
                  className="btn-success w-full flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate Excel Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Report Display */}
      {showItemDetail && itemDetailData && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Item Detail Report: {itemDetailData.item.name}
              </h3>
              <button
                onClick={generateItemDetailExcel}
                className="btn-success flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Item Detail Report
              </button>
            </div>

            {/* Item Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-primary-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Stock</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {itemDetailData.item.quantity}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center">
                  <Building className="h-8 w-8 text-success-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Purchased</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {itemDetailData.purchaseHistory.reduce((sum: number, p: any) => sum + p.quantity_added, 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-warning-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Issued</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {itemDetailData.issuedItems.reduce((sum: number, i: any) => sum + i.quantity_issued, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase History */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Purchase History</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Purchase Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {itemDetailData.purchaseHistory.map((purchase: any, index: number) => (
                      <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(purchase.purchase_date), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-primary">
                            {purchase.purchase_vendor || 'Not specified'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          +{purchase.quantity_added}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {purchase.notes || 'No notes'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Issued Items History */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Issued Items History</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Issued Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Issued To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Return Due
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {itemDetailData.issuedItems.map((issue: any) => (
                      <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(issue.issued_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {issue.user_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {issue.user_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {issue.quantity_issued}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {issue.returned ? (
                            <span className="badge-success">Returned</span>
                          ) : (
                            <span className="badge-warning">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(issue.return_due), 'MMM dd, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Preview Table */}
      {reportData && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Issued Items Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issued Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.issuedItems.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.user_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.user_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge-primary">{item.quantity_issued}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(item.issued_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.returned ? (
                        <span className="badge-success">Returned</span>
                      ) : (
                        <span className="badge-warning">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.current_stock_balance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.issuedItems.length > 10 && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                Showing first 10 items of {reportData.issuedItems.length} total items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportGenerator

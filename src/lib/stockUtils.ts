import { supabase } from './supabase'

export type StockCategory = 'general' | 'medical'

export interface StockItem {
  id: string
  name: string
  type: string
  quantity: number
  description: string | null
  purchase_vendor: string | null
  stock_category?: StockCategory
  expiry_date?: string | null
  batch_number?: string | null
  created_at: string
  updated_at: string
}

export interface StockItemWithAvailable extends StockItem {
  available_quantity: number
  issued_quantity: number
}

/**
 * Calculate available stock for a single item
 */
export const calculateAvailableStock = async (itemId: string): Promise<number> => {
  try {
    // Get total stock quantity
    const { data: stockItem, error: stockError } = await supabase
      .from('stock_items')
      .select('quantity')
      .eq('id', itemId)
      .single()

    if (stockError) throw stockError

    // Get total issued quantity (not returned)
    const { data: issuedItems, error: issuedError } = await supabase
      .from('issued_items')
      .select('quantity_issued')
      .eq('item_id', itemId)
      .eq('returned', false)

    if (issuedError) throw issuedError

    const totalIssued = issuedItems?.reduce((sum, item) => sum + item.quantity_issued, 0) || 0
    const available = stockItem.quantity - totalIssued

    return Math.max(0, available) // Never return negative
  } catch (error) {
    console.error('Error calculating available stock:', error)
    return 0
  }
}

/**
 * Get stock items with available quantities
 */
export const getStockItemsWithAvailable = async (): Promise<StockItemWithAvailable[]> => {
  try {
    // Get all stock items
    const { data: stockItems, error: stockError } = await supabase
      .from('stock_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (stockError) throw stockError

    // Get all issued items (not returned) grouped by item_id
    const { data: issuedItems, error: issuedError } = await supabase
      .from('issued_items')
      .select('item_id, quantity_issued')
      .eq('returned', false)

    if (issuedError) throw issuedError

    // Calculate issued quantities per item
    const issuedByItem: { [key: string]: number } = {}
    issuedItems?.forEach(item => {
      issuedByItem[item.item_id] = (issuedByItem[item.item_id] || 0) + item.quantity_issued
    })

    // Combine stock items with available quantities
    const itemsWithAvailable: StockItemWithAvailable[] = stockItems?.map(item => {
      const issuedQuantity = issuedByItem[item.id] || 0
      const availableQuantity = Math.max(0, item.quantity - issuedQuantity)
      
      return {
        ...item,
        available_quantity: availableQuantity,
        issued_quantity: issuedQuantity
      }
    }) || []

    return itemsWithAvailable
  } catch (error) {
    console.error('Error getting stock items with available quantities:', error)
    return []
  }
}

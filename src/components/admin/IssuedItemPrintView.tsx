import React from 'react'
import { format } from 'date-fns'
import logoImage from '../../logo.png'

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

interface IssuedItemPrintViewProps {
  item: IssuedItem
}

const IssuedItemPrintView: React.FC<IssuedItemPrintViewProps> = ({ item }) => {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="print-view">
      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          .print-view {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-header {
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .print-content {
            margin-bottom: 30px;
          }
          
          .print-signature-section {
            margin-top: 40px;
            border-top: 1px solid #000;
            padding-top: 20px;
          }
          
          .signature-line {
            border-bottom: 1px solid #000;
            width: 200px;
            height: 40px;
            margin: 10px 0;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
        }
      `}</style>

      {/* Print Button - Hidden when printing */}
      <div className="no-print mb-4">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Print Issued Item Details
        </button>
      </div>

      {/* Print Content */}
      <div className="print-view">
        {/* Header with Logo */}
        <div className="print-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={logoImage} alt="Company Logo" className="h-12 w-auto mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Management System</h1>
                <p className="text-sm text-gray-600">Issued Item Details</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Document ID: {item.id}</p>
              <p className="text-sm text-gray-600">Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          </div>
        </div>

        {/* Item Details */}
        <div className="print-content">
          <h2 className="text-xl font-bold mb-4">Item Information</h2>
          
          <table className="print-table">
            <tbody>
              <tr>
                <th className="w-1/3">Item Name</th>
                <td>{item.item_name}</td>
              </tr>
              <tr>
                <th>Item Type</th>
                <td>{item.item_type}</td>
              </tr>
              <tr>
                <th>Quantity Issued</th>
                <td>{item.quantity_issued}</td>
              </tr>
              <tr>
                <th>Issued Date</th>
                <td>{format(new Date(item.issued_date), 'MMMM dd, yyyy')}</td>
              </tr>
              <tr>
                <th>Return Due Date</th>
                <td>{format(new Date(item.return_due), 'MMMM dd, yyyy')}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  {item.returned ? 'Returned' : 
                   item.is_overdue ? `Overdue (${item.days_overdue} days)` : 'Active'}
                </td>
              </tr>
              {item.return_date && (
                <tr>
                  <th>Return Date</th>
                  <td>{format(new Date(item.return_date), 'MMMM dd, yyyy')}</td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 className="text-xl font-bold mb-4 mt-6">Recipient Information</h2>
          
          <table className="print-table">
            <tbody>
              <tr>
                <th className="w-1/3">Requested By</th>
                <td>{item.user_name}</td>
              </tr>
              <tr>
                <th>Email</th>
                <td>{item.user_email}</td>
              </tr>
              <tr>
                <th>Issued To</th>
                <td>{item.issued_to || 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          {item.admin_notes && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Admin Notes</h2>
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-sm">{item.admin_notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="print-signature-section">
          <h2 className="text-xl font-bold mb-4">Acknowledgement</h2>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium mb-2">Receiver Name:</p>
              <div className="signature-line"></div>
              <p className="text-xs text-gray-600 mt-1">Print Name</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Date Received:</p>
              <div className="signature-line"></div>
              <p className="text-xs text-gray-600 mt-1">Date</p>
            </div>
          </div>
          
          <div className="mt-6">
            <p className="text-sm font-medium mb-2">Signature:</p>
            <div className="signature-line" style={{ width: '300px', height: '60px' }}></div>
            <p className="text-xs text-gray-600 mt-1">Signature</p>
          </div>
          
          <div className="mt-8">
            <div className="border-t border-gray-300 pt-4">
              <p className="text-xs text-gray-600">
                <strong>Terms & Conditions:</strong> The above item(s) have been issued to the recipient. 
                The recipient is responsible for the proper care and timely return of the item(s) as per 
                the return due date. Any damage or loss will be the responsibility of the recipient.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IssuedItemPrintView

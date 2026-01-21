# Changelog

All notable changes to the StockFlow project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-XX

### Added

#### General Stock Enhancements
- **Expiry tracking for general stock**: General stock items can now have expiry dates and batch numbers (previously only medical items)
- **Unit type specification**: Added support for Box/PCS unit types, displayed next to quantities throughout the system
- **Expiry notifications**: Visual alerts for items expiring within one month (orange warning) and expired items (red highlight)
- **Discard functionality**: New discard system to track and deduct damaged, broken, or expired items from stock
  - Discard button in stock management interface
  - Reasons: Damaged, Broken, or Expired
  - Maintains discard history in `discarded_items` table
  - Automatically deducts quantity from stock

#### User Collaboration Features
- **Item transfers**: Guest users can now transfer items to other guest users
  - Transfer button in "My Items" view
  - Transfer history tracked in `item_transfers` table
  - Only active (non-returned) items can be transferred
- **Department management**: Added department field to users
  - Departments can be assigned when creating/editing users
  - Department filter in guest stock browser view
  - Better organization of users by department

#### Improved Visibility
- **Batch numbers visible to guests**: Guest users can now see batch numbers for all items
- **Expiry dates in all views**: Expiry dates displayed in StockBrowser and MyItems for guest users
- **Unit types displayed**: Unit types (Box/PCS) shown with quantities in all relevant views

### Changed

- **Stock Management UI**: Updated to show batch numbers and expiry dates for both general and medical stock
- **Stock Item Modal**: Enhanced to support unit type selection and optional expiry/batch for general items
- **Batch Upload**: Updated CSV format to include unit type, batch number, and expiry date for both stock categories
- **User Management**: Added department field to user creation and editing forms
- **Stock Browser**: Enhanced to display batch numbers, expiry dates, and unit types
- **My Items View**: Now shows batch numbers and expiry dates for issued items

### Database Changes

- **Migration 011**: `011_add_general_stock_expiry_and_features.sql`
  - Added `unit_type` column to `stock_items` table (box/pcs)
  - Added `department` column to `users` table
  - Created `discarded_items` table for tracking discarded items
  - Created `item_transfers` table for tracking item transfers between users
  - Added appropriate indexes and RLS policies

### Technical Details

- Updated `StockManagement` component to support unit types and general stock expiry
- Enhanced `StockBrowser` component with batch/expiry display and department filtering
- Updated `MyItems` component with batch/expiry display and transfer functionality
- Added `UserManagement` component support for department assignment
- Created `DiscardModal` component for discard operations
- Created `TransferModal` component for item transfers

## [1.0.0] - 2025-XX-XX

### Added

- Initial release
- General and medical stock management
- User management with admin/guest roles
- Request management system
- Asset register
- Batch number and expiry tracking for medical items
- Low stock alerts
- Batch upload functionality
- Purchase history tracking

---

[2.0.0]: https://github.com/yourusername/Stock/releases/tag/v2.0.0
[1.0.0]: https://github.com/yourusername/Stock/releases/tag/v1.0.0

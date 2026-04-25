// Category Types
export interface Category {
  id: number;
  name: string;
  description?: string;
  slug: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetCategoriesQuery {
  page?: number;
  limit?: number;
  parentId?: string;
}

// Item Types (Updated to match backend schema)
export interface Item {
  // Primary Key
  itemcode: string; // Primary key (changed from id)
  
  // Basic Information
  itemname?: string;
  Alternatename?: string;
  Barcode?: string;
  Description?: string;
  
  // Pricing
  CostPrice?: number; // Decimal in DB
  SalePrice?: number;
  UsagePrice?: number;
  
  // Stock
  stock_balance?: number;
  stock_min?: number;
  stock_max?: number;
  Minimum?: number;
  Maximum?: number;
  
  // Status & Flags
  item_status?: number; // 0 = active, etc.
  IsSet?: string; // '0' or '1'
  IsReuse?: string;
  IsNormal?: string;
  IsSpecial?: string;
  IsStock?: boolean;
  IsCancel?: number;
  IsSingle?: boolean;
  fixcost?: boolean;
  
  // IDs
  itemtypeID?: number;
  UnitID?: number;
  DepartmentID?: number;
  SupllierID?: number;
  warehouseID?: number;
  procedureID?: number;
  
  // Images
  Picture?: string;
  Picture2?: string;
  Picture3?: string;
  Picture4?: string;
  Picture5?: string;
  Picweb?: string;
  
  // Dates
  CreateDate?: string;
  ModiflyDate?: string;
  
  // Other
  weight?: number;
  Note?: string;
  RefNo?: string;
  SapCode?: string;
  InternalCode?: string;
  ManufacturerName?: string;
  SuplierName?: string;
  UserCreate?: number;
  UserModify?: number;
  
  // Legacy fields (for backward compatibility)
  category?: Category;

  // Department (from API when included)
  department?: {
    ID?: number;
    DepName?: string;
    DepName2?: string;
  };

  // Item stocks (from API when included, e.g. findAllItems)
  itemStocks?: ItemStockRow[];
  count_itemstock?: number;
  /** จำนวนอุปกรณ์ที่ถูกใช้งานในปัจจุบัน (จาก supply_usage_items) */
  qty_in_use?: number;
  /** จำนวนที่แจ้งชำรุด (จาก supply_item_return_records, return_reason=DAMAGED, อ้างอิงตู้/stock_id) */
  damaged_qty?: number;
  /** จำนวนที่ต้องเติม: X=M-A, Y=B+C; if X<Y then 0, if X>Y then X-Y */
  refill_qty?: number;
  /** Min/Max ต่อตู้ — จาก GET /items?cabinet_id= (CabinetItemSetting) */
  cabinetItemSetting?: { stock_min: number | null; stock_max: number | null } | null;
}

export interface ItemStockRow {
  RowID?: number;
  StockID?: number;
  Qty?: number;
  RfidCode?: string;
  ExpireDate?: string; // ISO date string
  expDate?: string | Date | null;
  /** true = อยู่ในตู้, false = ถูกเบิก */
  IsStock?: boolean;
  cabinet?: {
    id?: number;
    cabinet_name?: string;
    cabinet_code?: string;
    stock_id?: number;
    cabinetDepartments?: {
      id?: number;
      department_id?: number;
      status?: string;
      department?: {
        ID?: number;
        DepName?: string;
        DepName2?: string;
      };
    }[];
  };
}

export interface CreateItemDto {
  // Required
  itemcode: string; // Primary key, required
  
  // Basic Info
  itemname?: string;
  Alternatename?: string;
  Barcode?: string;
  Description?: string;
  
  // Pricing
  CostPrice?: number;
  SalePrice?: number;
  UsagePrice?: number;
  
  // Stock
  stock_balance?: number;
  stock_min?: number;
  stock_max?: number;
  Minimum?: number;
  Maximum?: number;
  
  // Status
  item_status?: number;
  IsSet?: string;
  IsReuse?: string;
  IsNormal?: string;
  IsSpecial?: string;
  IsStock?: boolean;
  
  // IDs
  itemtypeID?: number;
  UnitID?: number;
  DepartmentID?: number;
  SupllierID?: number;
  warehouseID?: number;
  
  // Images
  picture?: File; // For file upload
  Picture?: string; // For existing path
  
  // Other
  weight?: number;
  Note?: string;
  RefNo?: string;
  SapCode?: string;
  ManufacturerName?: string;
  SuplierName?: string;
}

export interface UpdateItemDto {
  // All fields optional for update
  itemname?: string;
  Alternatename?: string;
  Barcode?: string;
  Description?: string;
  
  // Pricing
  CostPrice?: number;
  SalePrice?: number;
  UsagePrice?: number;
  
  // Stock
  stock_balance?: number;
  stock_min?: number;
  stock_max?: number;
  Minimum?: number;
  Maximum?: number;
  
  // Status
  item_status?: number;
  IsSet?: string;
  IsReuse?: string;
  IsNormal?: string;
  IsSpecial?: string;
  IsStock?: boolean;
  
  // IDs
  itemtypeID?: number;
  UnitID?: number;
  DepartmentID?: number;
  SupllierID?: number;
  warehouseID?: number;
  
  // Images
  picture?: File;
  Picture?: string;
  
  // Other
  weight?: number;
  Note?: string;
  RefNo?: string;
  SapCode?: string;
  ManufacturerName?: string;
  SuplierName?: string;
}

export interface GetItemsQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  /** กรองชิปสถานะหน้า items-stock (all | expired | soon | low) — backend กรองก่อนแบ่งหน้า */
  stock_status?: string;
  /** กรองวันหมดเร็วสุด — อยู่หลังวันนี้แบบปฏิทิน (ไม่รวม YYYY-MM-DD) — RFID + cabinet_id */
  expire_from?: string;
  /** กรองถึงวันนี้รวม (YYYY-MM-DD) */
  expire_to?: string;
  /** กรอง itemStocks ตาม stock_id ของตู้ — ใช้หน้าสต๊อก RFID */
  cabinet_id?: number;
  department_id?: number;
  status?: string;
  item_status?: number;
  itemtypeID?: number;
  warehouseID?: number;
  sort_by?: 'itemname' | 'itemcode' | 'CostPrice' | 'stock_balance' | 'CreateDate';
  sort_order?: 'asc' | 'desc';
}


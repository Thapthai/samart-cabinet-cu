import { Type } from 'class-transformer';
import { IsString, IsInt, IsBoolean, IsNumber, IsOptional, IsNotEmpty, IsDecimal, MaxLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  itemcode: string;

  @IsOptional()
  @IsString()
  itemname?: string;

  @IsOptional()
  @IsString()
  Alternatename?: string;

  @IsOptional()
  @IsString()
  Barcode?: string;

  @IsOptional()
  @IsString()
  IsSet?: string;

  @IsOptional()
  @IsString()
  IsReuse?: string;

  @IsOptional()
  @IsString()
  IsNormal?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  itemtypeID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  UnitID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  SpecialID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  DepartmentID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ShelfLifeID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  SetCount?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  PackingMatID?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  CostPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  SalePrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  UsagePrice?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  SterileMachineID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  SterileProcessID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  WashMachineID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  WashProcessID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  SupllierID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  FactID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  LabelID?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  Minimum?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  Maximum?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsString()
  IsSpecial?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  LabelGroupID?: number;

  @IsOptional()
  @IsString()
  Picture?: string;

  @IsOptional()
  @IsString()
  Picture2?: string;

  @IsOptional()
  @IsBoolean()
  NoWash?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsWashDept?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  PriceID?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  itemcode2?: string;

  @IsOptional()
  @IsBoolean()
  IsNonUsage?: boolean;

  @IsOptional()
  @IsString()
  itemcode3?: string;

  @IsOptional()
  @IsBoolean()
  IsPrintDepartment?: boolean;

  @IsOptional()
  @IsBoolean()
  IsStock?: boolean;

  @IsOptional()
  @IsBoolean()
  IsRecieveRecordOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  IsWasting?: boolean;

  @IsOptional()
  @IsBoolean()
  IsCheckList?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  RoundOfTimeUsed?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  NoWashType?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsCSSDComfirm?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsDenger?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsInternalIndicatorCheck?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsFillterCheck?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsLabelingCheck?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsLoaner?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  LimitUse?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  PayDep?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsRemarkRound?: number;

  @IsOptional()
  @IsBoolean()
  IsReceiveNotSterile?: boolean;

  @IsOptional()
  @IsBoolean()
  IsReceiveManual?: boolean;

  @IsOptional()
  @IsString()
  RefNo?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsCancel?: number;

  @IsOptional()
  @IsBoolean()
  IsSingle?: boolean;

  @IsOptional()
  @IsBoolean()
  IsNotShowSendSterile?: boolean;

  @IsOptional()
  @IsString()
  Store?: string;

  @IsOptional()
  @IsString()
  PackingMat?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ShelfLife?: number;

  @IsOptional()
  @IsString()
  ManufacturerName?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  item_data_1_id?: number;

  @IsOptional()
  @IsString()
  InternalCode?: string;

  @IsOptional()
  @IsString()
  ManufacturerMemo?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  item_data_1?: number;

  @IsOptional()
  @IsString()
  Picweb?: string;

  @IsOptional()
  @IsString()
  SuplierName?: string;

  @IsOptional()
  @IsBoolean()
  IsNoSterile?: boolean;

  @IsOptional()
  @IsBoolean()
  IsShowQrItemCode?: boolean;

  @IsOptional()
  @IsString()
  SuplierNameMemo?: string;

  @IsOptional()
  @IsBoolean()
  IsSingleUsage?: boolean;

  @IsOptional()
  @IsString()
  ListUnderLineNo?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  Isopdipd?: number;

  @IsOptional()
  @IsString()
  Note?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  B_ID?: number;

  @IsOptional()
  @IsString()
  ListColorLineNo?: string;

  @IsOptional()
  @IsBoolean()
  IsPrintNoSterile?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsPayToSend?: number;

  @IsOptional()
  @IsBoolean()
  IsTrackAuto?: boolean;

  @IsOptional()
  @IsBoolean()
  IsGroupPrintSticker?: boolean;

  @IsOptional()
  @IsString()
  FileUpload?: string;

  @IsOptional()
  @IsBoolean()
  IsUsageName?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  Typeitemcode?: number;

  @IsOptional()
  @IsString()
  Picture3?: string;

  @IsOptional()
  @IsString()
  Picture4?: string;

  @IsOptional()
  @IsString()
  Picture5?: string;

  @IsOptional()
  @IsBoolean()
  IsFabric?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  WashPriceId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  SterilePriceId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ReProcessPrice?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  wash_price_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sterile_price_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reprocess_price?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  UserCreate?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  UserModify?: number;

  @IsOptional()
  @IsBoolean()
  IsNumber?: boolean;

  @IsOptional()
  @IsString()
  SapCode?: string;

  @IsOptional()
  @IsBoolean()
  IsChangeUsageInSet?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  IsNH?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  MaxInventory?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  procedureID?: number;

  @IsOptional()
  @IsString()
  Description?: string;

  @IsOptional()
  @IsString()
  ReuseDetect?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_max?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_min?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_balance?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  warehouseID?: number;

  @IsOptional()
  @IsBoolean()
  fixcost?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  main_max?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  main_min?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  item_status?: number;
}

import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { WeighingService } from './weighing.service';
import { ItemService } from '../item/item.service';
import { UpdateItemMinMaxDto } from '../item/dto/update-item-minmax.dto';

@Controller('weighing')
export class WeighingController {
  constructor(
    private readonly weighingService: WeighingService,
    private readonly itemService: ItemService,
  ) {}

  /**
   * GET /weighing — รายการ ItemSlotInCabinet แบบแบ่งหน้า
   * Query: page, limit, itemName (ค้นหาชื่ออุปกรณ์), itemcode, stockId (filter by cabinet.stock_id)
   */
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('itemName') itemName?: string,
    @Query('itemcode') itemcode?: string,
    @Query('stockId') stockId?: string,
    @Query('stock_status') stock_status?: string,
  ) {
    return this.weighingService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      itemName,
      itemcode,
      stockId: stockId ? parseInt(stockId, 10) : undefined,
      stock_status,
    });
  }

  /**
   * GET /weighing/low-stock — รายการ Weighing ที่จำนวนต่ำกว่า Min (แยกจาก GET /weighing)
   * Query: stockId (จำเป็น), itemName, page, limit — แต่ละแถวมี refillQuantity = max − qty เมื่อมีค่า max
   */
  @Get('low-stock')
  findLowStock(
    @Query('stockId') stockId?: string,
    @Query('itemName') itemName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.weighingService.findLowStockRefill({
      stockId: stockId ? parseInt(stockId, 10) : undefined,
      itemName,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /weighing/by-sign — รายการ Detail ตาม Sign (เบิก = '-', เติม = '+')
   * Query: sign, page, limit, itemName (ค้นหาชื่ออุปกรณ์), itemcode, stockId, dateFrom, dateTo (YYYY-MM-DD)
   */
  /**
   * PATCH /weighing/:itemcode/minmax — กำหนด min/max ต่อตู้ (CabinetItemSetting) สำหรับหน้า Weighing
   * Query: cabinet_id (จำเป็น) — รวมใน body ก็ได้
   * Body: { stock_min?, stock_max?, cabinet_id? }
   */
  @Patch(':itemcode/minmax')
  updateItemMinMax(
    @Param('itemcode') itemcode: string,
    @Body() body: UpdateItemMinMaxDto,
    @Query('cabinet_id') cabinetIdQuery?: string,
  ) {
    const dto = { ...body };
    if (dto.cabinet_id == null && cabinetIdQuery != null && cabinetIdQuery !== '') {
      const id = parseInt(cabinetIdQuery, 10);
      if (!Number.isNaN(id)) dto.cabinet_id = id;
    }
    return this.itemService.updateItemMinMax(itemcode, dto);
  }

  @Get('by-sign')
  findBySign(
    @Query('sign') sign?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('itemName') itemName?: string,
    @Query('itemcode') itemcode?: string,
    @Query('stockId') stockId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.weighingService.findDetailsBySign(sign === '+' ? '+' : '-', {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      itemName,
      itemcode,
      stockId: stockId ? parseInt(stockId, 10) : undefined,
      dateFrom,
      dateTo,
    });
  }

  /**
   * GET /weighing/:itemcode/details — รายการ ItemSlotInCabinetDetail ตาม itemcode
   */
  @Get(':itemcode/details')
  findDetails(
    @Param('itemcode') itemcode: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.weighingService.findDetailsByItemcode(itemcode, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /weighing/cabinets/list — รายการตู้ที่มีสต๊อก Weighing (สำหรับ dropdown หน้า weighing-departments)
   */
  @Get('cabinets/list')
  getCabinets() {
    return this.weighingService.findCabinetsWithWeighingStock();
  }

  /**
   * GET /weighing/:itemcode — หนึ่งรายการ ItemSlotInCabinet ตาม itemcode
   */
  @Get(':itemcode')
  findOne(@Param('itemcode') itemcode: string) {
    return this.weighingService.findByItemcode(itemcode);
  }
}

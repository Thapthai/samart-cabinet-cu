import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ItemService } from './item.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemMinMaxDto } from './dto/update-item-minmax.dto';

const fileInterceptorOptions = {
  storage: diskStorage({
    destination: process.env.UPLOAD_PATH || './uploads/items',
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(new Error('Only image files are allowed!'), false);
      return;
    }
    cb(null, true);
  },
};

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  async create(@Body() body: CreateItemDto) {
    return this.itemService.createItem(body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('picture', fileInterceptorOptions))
  async createWithFile(
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    if (file) {
      body.Picture = `uploads/items/${file.filename}`;
    }
    return this.itemService.createItem(body);
  }

  @Get('stats')
  async getStats(
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
  ) {
    const cabinetId = cabinet_id ? parseInt(cabinet_id, 10) : undefined;
    const departmentId = department_id ? parseInt(department_id, 10) : undefined;
    return this.itemService.getItemsStats(cabinetId, departmentId);
  }

  @Get('by-user/:user_id')
  async findByUser(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.itemService.findItemsByUser(user_id);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
    @Query('cabinet_id') cabinet_id?: string,
    @Query('department_id') department_id?: string,
    @Query('status') status?: string,
    @Query('stock_status') stock_status?: string,
    @Query('expire_from') expire_from?: string,
    @Query('expire_to') expire_to?: string,
  ) {
    const cabinetId = cabinet_id ? parseInt(cabinet_id, 10) : undefined;
    const departmentId = department_id ? parseInt(department_id, 10) : undefined;
    return this.itemService.findAllItems(
      page,
      limit,
      keyword,
      sort_by || 'itemcode',
      sort_order || 'asc',
      cabinetId,
      departmentId,
      status,
      stock_status,
      expire_from,
      expire_to,
    );
  }

  @Get(':itemcode')
  async findOne(@Param('itemcode') itemcode: string) {
    return this.itemService.findOneItem(itemcode);
  }

  @Put(':itemcode')
  @UseInterceptors(FileInterceptor('picture', fileInterceptorOptions))
  async update(
    @Param('itemcode') itemcode: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    const cleanBody: any = {};
    Object.keys(body || {}).forEach((key) => {
      const cleanKey = key.replace(/\t/g, '').trim();
      cleanBody[cleanKey] = body[key];
    });
    const updateItemDto: UpdateItemDto = {
      itemname: cleanBody.itemname,
      Barcode: cleanBody.Barcode,
      CostPrice: cleanBody.CostPrice ? parseFloat(cleanBody.CostPrice) : undefined,
      SalePrice: cleanBody.SalePrice ? parseFloat(cleanBody.SalePrice) : undefined,
      stock_balance: cleanBody.stock_balance ? parseInt(cleanBody.stock_balance, 10) : undefined,
      DepartmentID: cleanBody.DepartmentID ? parseInt(cleanBody.DepartmentID, 10) : undefined,
      item_status: cleanBody.item_status !== undefined ? parseInt(cleanBody.item_status, 10) : undefined,
    };
    if (file) {
      updateItemDto.Picture = `uploads/items/${file.filename}`;
    }
    return this.itemService.updateItem(itemcode, updateItemDto);
  }

  @Patch(':itemcode/minmax')
  async updateMinMax(
    @Param('itemcode') itemcode: string,
    @Body() updateMinMaxDto: UpdateItemMinMaxDto,
    @Query('cabinet_id') cabinetIdQuery?: string,
  ) {
    const dto = { ...updateMinMaxDto };
    if (dto.cabinet_id == null && cabinetIdQuery != null && cabinetIdQuery !== '') {
      const id = parseInt(cabinetIdQuery, 10);
      if (!Number.isNaN(id)) dto.cabinet_id = id;
    }
    return this.itemService.updateItemMinMax(itemcode, dto);
  }

  @Delete(':itemcode')
  async remove(@Param('itemcode') itemcode: string) {
    return this.itemService.removeItem(itemcode);
  }
}

@Controller('item-stocks')
export class ItemStockController {
  constructor(private readonly itemService: ItemService) {}

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    return this.itemService.findAllItemStock(
      page,
      limit,
      keyword,
      sort_by || 'ItemCode',
      sort_order || 'asc',
    );
  }

  @Get('in-cabinet')
  async findAllInCabinet(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('keyword') keyword?: string,
    @Query('cabinet_id') cabinet_id?: string,
  ) {
    const cabinetId = cabinet_id ? parseInt(cabinet_id, 10) : undefined;
    return this.itemService.findAllItemStockInCabinet(page, limit, keyword, cabinetId);
  }

  @Get('will-return')
  async findAllWillReturn() {
    return this.itemService.findAllItemStockWillReturn();
  }

  /**
   * RFID จัดกลุ่มตาม itemcode สำหรับตู้ (stock_id)
   * Response: { success, data: { [itemcode]: [{ rowId, rfidCode, expireDate }] } }
   */
  @Get('rfid-lines-grouped')
  async findRfidLinesGrouped(
    @Query('stock_id') stock_id?: string,
    @Query('keyword') keyword?: string,
  ) {
    const stockId = stock_id ? parseInt(stock_id, 10) : NaN;
    if (stock_id == null || stock_id === '' || Number.isNaN(stockId) || stockId <= 0) {
      return { success: false, message: 'ต้องระบุ stock_id', data: {} };
    }
    return this.itemService.findRfidLinesGroupedByStock(stockId, keyword);
  }

  /** รายการ RFID ใน itemstock ต่อรหัสสินค้า + StockID (ตู้) */
  @Get('rfid-lines')
  async findRfidLines(
    @Query('itemcode') itemcode?: string,
    @Query('stock_id') stock_id?: string,
  ) {
    const stockId = stock_id ? parseInt(stock_id, 10) : NaN;
    if (itemcode == null || itemcode.trim() === '' || stock_id == null || stock_id === '' || Number.isNaN(stockId) || stockId <= 0) {
      return { success: false, message: 'ต้องระบุ itemcode และ stock_id', data: [] };
    }
    return this.itemService.findRfidLinesByItemAndStock(itemcode, stockId);
  }
}

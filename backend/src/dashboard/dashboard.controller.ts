import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** สรุปภาพรวมสำหรับหน้า Admin Dashboard (สต็อก, ตู้, แมปปิง, กิจกรรม 7 วัน, รายการล่าสุด) */
  @Get('overview')
  getOverview() {
    return this.dashboardService.getAdminOverview();
  }
}

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { WeighingModule } from '../weighing/weighing.module';

@Module({
  imports: [WeighingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

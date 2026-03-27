import { Module } from '@nestjs/common';
import { WeighingController } from './weighing.controller';
import { WeighingService } from './weighing.service';
import { ItemModule } from '../item/item.module';

@Module({
  imports: [ItemModule],
  controllers: [WeighingController],
  providers: [WeighingService],
  exports: [WeighingService],
})
export class WeighingModule {}

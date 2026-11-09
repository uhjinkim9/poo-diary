import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CycleController } from "./cycle.controller";
import { CycleService } from "./cycle.service";
import { MenstrualCycleEntity } from "./menstrual-cycle.entity";
import { ReminderModule } from "../reminders/reminder.module";

@Module({
  imports: [TypeOrmModule.forFeature([MenstrualCycleEntity]), AuthModule, ReminderModule],
  controllers: [CycleController],
  providers: [CycleService],
})
export class CycleModule {}

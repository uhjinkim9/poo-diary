import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DiaryController } from "./diary.controller";
import { DiaryService } from "./diary.service";
import { DiaryEntryEntity } from "./diary.entity";
import { DailyBowelStatusEntity } from "./daily-bowel-status.entity";
import { MenstrualCycleEntity } from "../cycle/menstrual-cycle.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DiaryEntryEntity, DailyBowelStatusEntity, MenstrualCycleEntity]),
    AuthModule,
  ],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}

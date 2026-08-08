import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DiaryController } from "./diary.controller";
import { DiaryService } from "./diary.service";
import { DiaryEntryEntity } from "./diary.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DiaryEntryEntity])],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}

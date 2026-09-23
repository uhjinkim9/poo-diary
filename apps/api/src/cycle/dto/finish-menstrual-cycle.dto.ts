import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class FinishMenstrualCycleDto {
  @ApiProperty({ description: "생리 종료일 (YYYY-MM-DD)" })
  @IsDateString()
  endedAt!: string;
}

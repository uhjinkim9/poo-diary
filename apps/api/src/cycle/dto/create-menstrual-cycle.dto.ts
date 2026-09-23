import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class CreateMenstrualCycleDto {
  @ApiProperty({ description: "생리 시작일 (YYYY-MM-DD)" })
  @IsDateString()
  startedAt!: string;
}

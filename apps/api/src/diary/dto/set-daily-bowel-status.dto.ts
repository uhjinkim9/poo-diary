import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class SetDailyBowelStatusDto {
  @ApiProperty({ description: "해당 날짜에 배변이 없었는지 여부" })
  @IsBoolean()
  noBowelMovement!: boolean;
}

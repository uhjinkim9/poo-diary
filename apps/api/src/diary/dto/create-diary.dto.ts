import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { BristolType, FoodTag, StoolColor } from "@poo-diary/shared";

const FOOD_TAGS = [
  "meat",
  "fish",
  "dairy",
  "vegetables",
  "fruits",
  "rice",
  "bread",
  "noodles",
  "spicy",
  "fatty",
  "caffeine",
  "alcohol",
  "processed",
  "water",
] as const;

export class CreateDiaryDto {
  @ApiProperty({ description: "브리스톨 척도 (1~7)", minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  bristolType!: BristolType;

  @ApiProperty({
    description: "대변 색상",
    enum: ["brown", "tan", "dark-brown", "yellow", "green", "red", "black"],
  })
  @IsEnum(["brown", "tan", "dark-brown", "yellow", "green", "red", "black"])
  color!: StoolColor;

  @ApiProperty({ description: "통증 여부" })
  @IsBoolean()
  hasPain!: boolean;

  @ApiPropertyOptional({
    description: "통증 강도 (1~5)",
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  painLevel?: number;

  @ApiPropertyOptional({ description: "식품 태그 목록", type: [String] })
  @IsOptional()
  @IsArray()
  @IsEnum(FOOD_TAGS, { each: true })
  foods?: FoodTag[];

  @ApiPropertyOptional({
    description: "오늘 먹은 메뉴 (최대 200자)",
    example: "김치찌개, 삼겹살",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  mealNote?: string;

  @ApiPropertyOptional({ description: "메모 (최대 300자)" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  memo?: string;

  @ApiPropertyOptional({ description: "기록 시각 (ISO 8601)" })
  @IsOptional()
  @IsISO8601()
  recordedAt?: string;
}

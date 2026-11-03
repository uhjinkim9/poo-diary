import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class SavePushSubscriptionDto {
  @ApiProperty()
  @IsUrl({ protocols: ["https"] })
  @MaxLength(4096)
  endpoint!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1024)
  p256dh!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1024)
  auth!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  expirationTime?: string | null;
}

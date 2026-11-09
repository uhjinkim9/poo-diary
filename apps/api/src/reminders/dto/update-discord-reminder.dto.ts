import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class UpdateDiscordReminderDto {
  @ApiPropertyOptional({ description: "Discord Incoming Webhook URL" })
  @IsOptional() @IsString() @IsUrl({ protocols: ["https"] }) @MaxLength(2048)
  webhookUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  menstrualEnabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  bowelCheerEnabled?: boolean;
}

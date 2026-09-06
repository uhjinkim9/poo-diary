import { IsOptional, IsString, MaxLength } from "class-validator";

export class LinkAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrl?: string;
}

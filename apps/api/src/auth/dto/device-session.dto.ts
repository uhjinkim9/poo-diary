import { IsUUID } from "class-validator";

export class DeviceSessionDto {
  @IsUUID("4")
  deviceUserId!: string;
}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { MenstrualCycleEntity } from "../cycle/menstrual-cycle.entity";
import { ReminderController, ReminderInternalController } from "./reminder.controller";
import { DiscordReminderDeliveryEntity, DiscordReminderSettingEntity } from "./reminder.entities";
import { ReminderService } from "./reminder.service";
@Module({ imports: [AuthModule, TypeOrmModule.forFeature([DiscordReminderSettingEntity, DiscordReminderDeliveryEntity, MenstrualCycleEntity])], controllers: [ReminderController, ReminderInternalController], providers: [ReminderService], exports: [ReminderService] })
export class ReminderModule {}

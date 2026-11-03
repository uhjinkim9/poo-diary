import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { LegacyDeviceUserEntity, MercuryUserEntity } from "../auth/auth.entities";
import {
  NotificationController,
  NotificationInternalController,
} from "./notification.controller";
import {
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  PushSubscriptionEntity,
} from "./notification.entities";
import { NotificationService } from "./notification.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PushSubscriptionEntity,
      NotificationPreferenceEntity,
      NotificationDeliveryEntity,
      LegacyDeviceUserEntity,
      MercuryUserEntity,
    ]),
  ],
  controllers: [NotificationController, NotificationInternalController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

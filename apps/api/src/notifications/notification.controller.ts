import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest } from "fastify";
import { timingSafeEqual } from "crypto";
import { AuthGuard } from "../auth/auth.guard";
import { SavePushSubscriptionDto } from "./dto/save-push-subscription.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import { NotificationService } from "./notification.service";

@ApiTags("notifications")
@UseGuards(AuthGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get("config")
  config(@Req() request: FastifyRequest) {
    return this.notifications.getClientConfig(request.authPrincipal!);
  }

  @Put("preferences")
  updatePreference(
    @Req() request: FastifyRequest,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notifications.updatePreference(request.authPrincipal!, dto);
  }

  @Post("subscriptions")
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(
    @Req() request: FastifyRequest,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    return this.notifications.saveSubscription(request.authPrincipal!, dto);
  }

  @Delete("subscriptions")
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @Req() request: FastifyRequest,
    @Body("endpoint") endpoint: string,
  ) {
    return this.notifications.removeSubscription(request.authPrincipal!, endpoint);
  }
}

@Controller("internal/notifications")
export class NotificationInternalController {
  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  @Post("run")
  async run(@Headers("x-internal-cron-token") supplied?: string) {
    const expected = this.config.get<string>("INTERNAL_CRON_TOKEN");
    if (!expected || !supplied) throw new UnauthorizedException();
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      throw new UnauthorizedException();
    }
    return this.notifications.runScheduledNotifications();
  }
}

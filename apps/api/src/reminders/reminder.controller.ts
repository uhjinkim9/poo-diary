import { Body, Controller, Get, Headers, Post, Put, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import { UpdateDiscordReminderDto } from "./dto/update-discord-reminder.dto";
import { ReminderService } from "./reminder.service";

@ApiTags("reminders") @UseGuards(AuthGuard) @Controller("reminders")
export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}
  @Get("config") config(@Req() request: FastifyRequest) { return this.reminders.getConfig(request.authPrincipal!); }
  @Put("config") update(@Req() request: FastifyRequest, @Body() dto: UpdateDiscordReminderDto) { return this.reminders.update(request.authPrincipal!, dto); }
  @Post("test") test(@Req() request: FastifyRequest) { return this.reminders.test(request.authPrincipal!); }
}

@Controller("internal/reminders")
export class ReminderInternalController {
  constructor(private readonly config: ConfigService, private readonly reminders: ReminderService) {}
  @Post("run") run(@Headers("x-internal-cron-token") supplied?: string) {
    const expected = this.config.get<string>("INTERNAL_CRON_TOKEN");
    if (!expected || !supplied || expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) throw new UnauthorizedException();
    return this.reminders.runScheduledReminders();
  }
}

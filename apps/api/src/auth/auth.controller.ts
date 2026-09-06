import {
  Body,
  ConflictException,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { DeviceSessionDto } from "./dto/device-session.dto";
import { LinkAccountDto } from "./dto/link-account.dto";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private redirect(reply: FastifyReply, location: string, cookies: string[]) {
    reply.header("set-cookie", cookies);
    return reply.code(302).redirect(location);
  }

  @Post("device-session")
  async deviceSession(
    @Body() dto: DeviceSessionDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header(
      "set-cookie",
      await this.authService.establishDeviceSession(dto.deviceUserId),
    );
    return { authenticated: true, mode: "legacy" };
  }

  @Get("status")
  status(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    reply.header("cache-control", "no-store");
    return this.authService.status(request);
  }

  @Get(["login", "oidc/login"])
  async login(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("returnTo") returnTo?: string,
    @Query("silent") silent?: string,
    @Query("fresh") fresh?: string,
  ) {
    const result = await this.authService.beginLogin(
      request,
      returnTo,
      silent === "1",
      fresh === "1",
    );
    return this.redirect(reply, result.location, result.cookies);
  }

  @Get("callback/keycloak")
  async callback(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ) {
    if (error || !code || !state) {
      this.logger.warn(
        `OIDC callback rejected by provider: ${error ?? "missing_code_or_state"}`,
      );
      const names = this.authService.cookieNames;
      reply.header("set-cookie", [
        this.authService.clearCookie(names.transaction),
      ]);
      return reply
        .code(302)
        .redirect(`/profile?oidc_error=${encodeURIComponent(error ?? "callback_failed")}`);
    }
    try {
      const result = await this.authService.completeLogin(request, code, state);
      return this.redirect(reply, result.location, result.cookies);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unknown callback error";
      const stack = caught instanceof Error ? caught.stack : undefined;
      this.logger.error(`OIDC callback failed: ${message}`, stack);
      const names = this.authService.cookieNames;
      reply.header("set-cookie", this.authService.clearCookie(names.transaction));
      return reply.code(302).redirect("/profile?oidc_error=callback_failed");
    }
  }

  @Post("refresh")
  refresh(@Req() request: FastifyRequest) {
    return this.authService.currentUser(request);
  }

  @Post("oidc/link-account")
  async linkAccount(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: LinkAccountDto,
  ) {
    const result = await this.authService.beginAccountLink(
      request,
      body.returnUrl,
    );
    reply.header("set-cookie", result.cookies);
    return { authorizationUrl: result.location };
  }

  @Post("oidc/relink-account")
  relinkAccount() {
    throw new ConflictException(
      "푸다이어리는 임시 로컬 사용자를 생성하지 않으므로 자동 재연결 대상이 없습니다.",
    );
  }

  @Post("logout")
  async logout(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const result = await this.authService.logout(request);
    return this.redirect(reply, result.location, result.cookies);
  }
}

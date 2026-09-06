import { Controller, Get, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";

@Controller("users")
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  me(@Req() request: FastifyRequest) {
    return this.authService.currentUser(request);
  }
}

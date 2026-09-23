import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import { CycleService } from "./cycle.service";
import { CreateMenstrualCycleDto } from "./dto/create-menstrual-cycle.dto";
import { FinishMenstrualCycleDto } from "./dto/finish-menstrual-cycle.dto";

@ApiTags("cycle")
@UseGuards(AuthGuard)
@Controller("cycles")
export class CycleController {
  constructor(private readonly cycleService: CycleService) {}

  @Get()
  findAll(@Req() request: FastifyRequest) { return this.cycleService.findAll(request.authPrincipal!); }

  @Post()
  create(@Req() request: FastifyRequest, @Body() dto: CreateMenstrualCycleDto) { return this.cycleService.create(request.authPrincipal!, dto); }

  @Patch(":id/end")
  finish(@Req() request: FastifyRequest, @Param("id") id: string, @Body() dto: FinishMenstrualCycleDto) { return this.cycleService.finish(request.authPrincipal!, id, dto); }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: FastifyRequest, @Param("id") id: string) { return this.cycleService.remove(request.authPrincipal!, id); }
}

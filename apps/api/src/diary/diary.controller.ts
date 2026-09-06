import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import { DiaryService } from "./diary.service";
import { CreateDiaryDto } from "./dto/create-diary.dto";
import { UpdateDiaryDto } from "./dto/update-diary.dto";

@ApiTags("diary")
@UseGuards(AuthGuard)
@Controller("diary")
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @ApiOperation({ summary: "전체 배변 일지 조회" })
  @Get()
  findAll(@Req() request: FastifyRequest) {
    return this.diaryService.findAll(request.authPrincipal!);
  }

  @ApiOperation({ summary: "식품별 배변 상관관계 통계" })
  @Get("stats/food-correlation")
  getFoodCorrelation(@Req() request: FastifyRequest) {
    return this.diaryService.getFoodCorrelation(request.authPrincipal!);
  }

  @ApiOperation({ summary: "배변 일지 단건 조회" })
  @Get(":id")
  findOne(@Req() request: FastifyRequest, @Param("id") id: string) {
    return this.diaryService.findOne(id, request.authPrincipal!);
  }

  @ApiOperation({ summary: "배변 일지 생성" })
  @Post()
  create(@Req() request: FastifyRequest, @Body() dto: CreateDiaryDto) {
    return this.diaryService.create(request.authPrincipal!, dto);
  }

  @ApiOperation({ summary: "배변 일지 수정" })
  @Patch(":id")
  update(
    @Req() request: FastifyRequest,
    @Param("id") id: string,
    @Body() dto: UpdateDiaryDto,
  ) {
    return this.diaryService.update(id, request.authPrincipal!, dto);
  }

  @ApiOperation({ summary: "배변 일지 삭제" })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: FastifyRequest, @Param("id") id: string) {
    return this.diaryService.remove(id, request.authPrincipal!);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DiaryService } from "./diary.service";
import { CreateDiaryDto } from "./dto/create-diary.dto";
import { UpdateDiaryDto } from "./dto/update-diary.dto";

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new BadRequestException("x-user-id 헤더가 필요합니다.");
  return userId;
}

@ApiTags("diary")
@ApiHeader({ name: "x-user-id", description: "사용자 UUID", required: true })
@Controller("diary")
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @ApiOperation({ summary: "전체 배변 일지 조회" })
  @Get()
  findAll(@Headers("x-user-id") userId: string) {
    return this.diaryService.findAll(requireUserId(userId));
  }

  @ApiOperation({ summary: "식품별 배변 상관관계 통계" })
  @Get("stats/food-correlation")
  getFoodCorrelation(@Headers("x-user-id") userId: string) {
    return this.diaryService.getFoodCorrelation(requireUserId(userId));
  }

  @ApiOperation({ summary: "배변 일지 단건 조회" })
  @Get(":id")
  findOne(@Headers("x-user-id") userId: string, @Param("id") id: string) {
    return this.diaryService.findOne(id, requireUserId(userId));
  }

  @ApiOperation({ summary: "배변 일지 생성" })
  @Post()
  create(@Headers("x-user-id") userId: string, @Body() dto: CreateDiaryDto) {
    return this.diaryService.create(requireUserId(userId), dto);
  }

  @ApiOperation({ summary: "배변 일지 수정" })
  @Patch(":id")
  update(
    @Headers("x-user-id") userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateDiaryDto,
  ) {
    return this.diaryService.update(id, requireUserId(userId), dto);
  }

  @ApiOperation({ summary: "배변 일지 삭제" })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Headers("x-user-id") userId: string, @Param("id") id: string) {
    return this.diaryService.remove(id, requireUserId(userId));
  }
}

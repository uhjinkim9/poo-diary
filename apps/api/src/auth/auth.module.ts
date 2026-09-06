import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AccountLinkEntity,
  AccountAuditLogEntity,
  AppSessionEntity,
  LegacyDeviceUserEntity,
  MercuryUserEntity,
  OidcAuthTransactionEntity,
} from "./auth.entities";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { UsersController } from "./users.controller";
import { MercuryIdentityService } from "./mercury-identity.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LegacyDeviceUserEntity,
      MercuryUserEntity,
      AccountLinkEntity,
      AccountAuditLogEntity,
      OidcAuthTransactionEntity,
      AppSessionEntity,
    ]),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, AuthGuard, MercuryIdentityService],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}

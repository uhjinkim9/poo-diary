import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DiaryModule } from "./diary/diary.module";
import { DiaryEntryEntity } from "./diary/diary.entity";
import { DailyBowelStatusEntity } from "./diary/daily-bowel-status.entity";
import { MenstrualCycleEntity } from "./cycle/menstrual-cycle.entity";
import { CycleModule } from "./cycle/cycle.module";
import { AuthModule } from "./auth/auth.module";
import {
  AccountLinkEntity,
  AccountAuditLogEntity,
  AppSessionEntity,
  LegacyDeviceUserEntity,
  MercuryUserEntity,
  OidcAuthTransactionEntity,
} from "./auth/auth.entities";
import { AddMercuryIdentity1725321600000 } from "./migrations/1725321600000-add-mercury-identity";
import { AddAccountAuditLogs1788624000000 } from "./migrations/1788624000000-add-account-audit-logs";
import { AddBowelExperienceAndDailyStatus1790208000000 } from "./migrations/1790208000000-add-bowel-experience-and-daily-status";
import { AddMenstrualCycles1790294400000 } from "./migrations/1790294400000-add-menstrual-cycles";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: config.get<number>("DB_PORT", 5432),
        username: config.get<string>("DB_USER", "postgres"),
        password: config.get<string>("DB_PASSWORD", "postgres"),
        database: config.get<string>("DB_NAME", "poo_diary"),
        entities: [
          DiaryEntryEntity,
          DailyBowelStatusEntity,
          MenstrualCycleEntity,
          LegacyDeviceUserEntity,
          MercuryUserEntity,
          AccountLinkEntity,
          AccountAuditLogEntity,
          OidcAuthTransactionEntity,
          AppSessionEntity,
        ],
        migrations: [
          AddMercuryIdentity1725321600000,
          AddAccountAuditLogs1788624000000,
          AddBowelExperienceAndDailyStatus1790208000000,
          AddMenstrualCycles1790294400000,
        ],
        migrationsRun: config.get<string>("DB_MIGRATIONS_RUN", "false") === "true",
        synchronize: config.get<string>("NODE_ENV") !== "production",
        logging: config.get<string>("NODE_ENV") === "development",
        ssl:
          config.get<string>("DB_SSL") === "true"
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    AuthModule,
    DiaryModule,
    CycleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DiaryModule } from "./diary/diary.module";
import { DiaryEntryEntity } from "./diary/diary.entity";

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
        entities: [DiaryEntryEntity],
        synchronize: config.get<string>("NODE_ENV") !== "production",
        logging: config.get<string>("NODE_ENV") === "development",
        ssl:
          config.get<string>("DB_SSL") === "true"
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    DiaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

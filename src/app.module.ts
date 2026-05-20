import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./utils/auth";
import { ServicesModule } from "./services/services.modules";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [AuthModule.forRoot({ auth }), PrismaModule, ServicesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { MissionsController } from "./missions.controller";
import { MissionsService } from "./missions.service";
import { RolesGuard } from "src/common/guards/Roles.guard";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

@Module({
  controllers: [MissionsController],
  providers: [MissionsService, AuthGuard, RolesGuard],
  exports: [MissionsService],
})
export class MissionsModule {}

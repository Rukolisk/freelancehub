import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RolesGuard } from "src/common/guards/Roles.guard";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AuthGuard, RolesGuard],
})
export class AdminModule {}

import { Module } from "@nestjs/common";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { RolesGuard } from "src/common/guards/Roles.guard";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, AuthGuard, RolesGuard],
})
export class ReviewsModule {}

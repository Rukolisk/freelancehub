import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/reviews.dto";
import { RolesGuard } from "src/common/guards/Roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/types";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

@ApiTags("Reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post("missions/:missionId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Évaluer une mission terminée (CLIENT)",
    description:
      "Mission doit être COMPLETED. Une seule évaluation par mission.",
  })
  create(
    @Param("missionId") missionId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user,
  ) {
    return this.reviewsService.create(missionId, dto, user.id);
  }

  @Get("freelances/:freelanceId")
  @ApiOperation({
    summary: "Avis d'un freelance avec note moyenne dynamique (public)",
  })
  getFreelanceReviews(@Param("freelanceId") freelanceId: string) {
    return this.reviewsService.getFreelanceReviews(freelanceId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détail d'une évaluation (public)" })
  findOne(@Param("id") id: string) {
    return this.reviewsService.findOne(id);
  }
}

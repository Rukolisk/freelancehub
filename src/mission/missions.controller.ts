import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MissionsService } from "./missions.service";
import {
  CreateMissionDto,
  UpdateMissionStatusDto,
  MissionQueryDto,
} from "./dto/missions.dto";
import { RolesGuard } from "src/common/guards/Roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/types";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

@ApiTags("Missions")
@Controller("missions")
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth("access-token")
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: "Souscrire à un service → crée une mission PENDING (CLIENT)",
  })
  create(@Body() dto: CreateMissionDto, @CurrentUser() user) {
    return this.missionsService.create(dto, user.id);
  }

  @Get()
  @Roles(Role.CLIENT, Role.FREELANCE, Role.ADMIN)
  @ApiOperation({ summary: "Lister les missions (scopé par rôle)" })
  findAll(@CurrentUser() user, @Query() query: MissionQueryDto) {
    return this.missionsService.findAll(user.id, user.role, query);
  }

  @Get(":id")
  @Roles(Role.CLIENT, Role.FREELANCE, Role.ADMIN)
  @ApiOperation({ summary: "Détail d'une mission (participants ou ADMIN)" })
  findOne(@Param("id") id: string, @CurrentUser() user) {
    return this.missionsService.findOne(id, user.id, user.role);
  }

  @Patch(":id/status")
  @Roles(Role.CLIENT, Role.FREELANCE, Role.ADMIN)
  @ApiOperation({
    summary: "Changer le statut d'une mission",
    description: `Transitions autorisées :\n
- **FREELANCE** : PENDING→ACCEPTED, PENDING→CANCELLED, ACCEPTED→IN_PROGRESS, ACCEPTED→CANCELLED, IN_PROGRESS→COMPLETED
- **CLIENT**    : PENDING→CANCELLED, ACCEPTED→CANCELLED, IN_PROGRESS→DISPUTED
- **ADMIN**     : toutes les transitions de modération + résolution de litiges`,
  })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateMissionStatusDto,
    @CurrentUser() user,
  ) {
    return this.missionsService.updateStatus(id, dto, user.id, user.role);
  }

  @Get(":id/logs")
  @Roles(Role.CLIENT, Role.FREELANCE, Role.ADMIN)
  @ApiOperation({ summary: "Journal des changements de statut (MissionLog)" })
  getLogs(@Param("id") id: string, @CurrentUser() user) {
    return this.missionsService.getLogs(id, user.id, user.role);
  }
}

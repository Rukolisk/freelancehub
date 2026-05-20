import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ServicesService } from "./services.service";
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from "./dto/services.dto";

import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { TagsTransformPipe } from "src/common/pipes/tags-transform.pipe";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

@ApiTags("Services")
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Créer un service (FREELANCE uniquement)" })
  create(@Body() dto: CreateServiceDto, @CurrentUser() user) {
    return this.servicesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      "Lister les services (public) — filtrage + pagination cursor-based",
  })
  findAll(@Query(new TagsTransformPipe()) query: ServiceQueryDto) {
    return this.servicesService.findAll(query);
  }

  @Get("my")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Mes services (FREELANCE)" })
  getMyServices(@CurrentUser() user) {
    return this.servicesService.getMyServices(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Détail d'un service" })
  findOne(@Param("id") id: string) {
    return this.servicesService.findOne(id);
  }

  @Put(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Modifier un service (propriétaire)" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user,
  ) {
    return this.servicesService.update(id, dto, user.id);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Supprimer un service (propriétaire)" })
  remove(@Param("id") id: string, @CurrentUser() user) {
    return this.servicesService.remove(id, user.id);
  }
}

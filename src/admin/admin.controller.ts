import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Multer } from "multer";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { Response } from "express";
import { MissionExportQueryDto } from "./dto/admin.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/types";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RolesGuard } from "src/common/guards/Roles.guard";
import { AdminService } from "./admin.service";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth("access-token")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Dashboard de statistiques globales (ADMIN)" })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get("users")
  @ApiOperation({ summary: "Liste tous les utilisateurs (ADMIN)" })
  @ApiQuery({ name: "role", required: false, enum: Role })
  getUsers(@Query("role") role?: string) {
    return this.adminService.getUsers(role);
  }

  @Get("missions/export")
  @ApiOperation({
    summary: "Export CSV des missions avec filtres (ADMIN)",
    description: "Télécharge un fichier CSV — compatible Excel (BOM UTF-8).",
  })
  async exportMissions(
    @Query() query: MissionExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.adminService.exportMissionsCsv(query);
    const filename = `missions_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\ufeff" + csv); // BOM pour compatibilité Excel
  }

  @Post("freelances/import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "CSV avec colonnes: email, name, bio",
        },
      },
    },
  })
  @ApiOperation({
    summary: "Import CSV de freelances (ADMIN)",
    description:
      "Colonnes attendues : email (requis), name (requis), bio (optionnel).\nRetourne un rapport : créés, ignorés, erreurs par ligne.",
  })
  importFreelances(@UploadedFile() file: Multer.File) {
    if (!file) throw new BadRequestException("Fichier CSV requis");
    return this.adminService.importFreelancesCsv(file.buffer);
  }
}

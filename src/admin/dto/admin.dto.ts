import { IsOptional, IsEnum, IsString, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionStatus } from "src/common/types";

export class MissionExportQueryDto {
  @ApiPropertyOptional({
    enum: MissionStatus,
    description: "Filtrer par statut",
  })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @ApiPropertyOptional({ description: "Date de début ISO (ex: 2025-01-01)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "Date de fin ISO (ex: 2025-12-31)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Filtrer par ID freelance" })
  @IsOptional()
  @IsString()
  freelanceId?: string;
}

import { IsOptional, IsString, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { MissionStatus } from "src/common/types";

export class CreateMissionDto {
  @ApiProperty({ description: "ID du service auquel souscrire" })
  @IsString()
  serviceId: string;

  @ApiPropertyOptional({
    description: "Notes ou instructions particulières pour le freelance",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMissionStatusDto {
  @ApiProperty({
    enum: MissionStatus,
    description:
      "Nouveau statut (les transitions sont contrôlées selon le rôle)",
  })
  @IsEnum(MissionStatus, { message: "Statut invalide" })
  status: MissionStatus;

  @ApiPropertyOptional({
    description: "Commentaire sur le changement de statut",
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class MissionQueryDto {
  @ApiPropertyOptional({ enum: MissionStatus })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

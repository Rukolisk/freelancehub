import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateServiceDto {
  @ApiProperty({ example: "Développement API REST NestJS" })
  @IsString()
  @IsNotEmpty({ message: "Le titre est requis" })
  title: string;

  @ApiProperty({
    example: "API complète avec auth, tests et documentation Swagger.",
  })
  @IsString()
  @IsNotEmpty({ message: "La description est requise" })
  description: string;

  @ApiProperty({ example: 500, description: "Prix en euros" })
  @IsNumber()
  @IsPositive({ message: "Le prix doit être positif" })
  price: number;

  @ApiProperty({ example: "Développement Web" })
  @IsString()
  @IsNotEmpty({ message: "La catégorie est requise" })
  category: string;

  @ApiPropertyOptional({ example: ["nestjs", "typescript", "api"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceQueryDto {
  @ApiPropertyOptional({ description: "Recherche dans titre et description" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Tags séparés par virgule : nestjs,typescript",
  })
  @IsOptional()
  tags?: string | string[];

  @ApiPropertyOptional({ description: "Prix minimum (€)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: "Prix maximum (€)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "ID du dernier élément (cursor-based pagination)",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ enum: ["price", "createdAt", "title"] })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

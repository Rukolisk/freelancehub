import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: "Note de 1 à 5 étoiles" })
  @IsInt({ message: "La note doit être un entier" })
  @Min(1, { message: "La note minimale est 1" })
  @Max(5, { message: "La note maximale est 5" })
  rating: number;

  @ApiPropertyOptional({
    example: "Excellent travail, livré dans les délais !",
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

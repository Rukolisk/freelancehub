import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/reviews.dto";
import { MissionStatus } from "../common/types";

/**
 * Gestion des évaluations de missions.
 *
 * Contraintes métier :
 * - Seul le CLIENT de la mission peut évaluer
 * - La mission doit être COMPLETED
 * - Une seule évaluation par mission (unicité garantie par @unique en BDD)
 * - La note moyenne est calculée dynamiquement via agrégation Prisma
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une évaluation pour une mission COMPLETED.
   */
  async create(missionId: string, dto: CreateReviewDto, clientId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { review: true },
    });

    if (!mission) throw new NotFoundException("Mission introuvable");
    if (mission.clientId !== clientId) {
      throw new ForbiddenException(
        "Seul le client de la mission peut laisser un avis",
      );
    }
    if (mission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException(
        `Une évaluation ne peut être soumise que pour une mission COMPLETED (statut actuel : ${mission.status})`,
      );
    }
    if (mission.review) {
      throw new ConflictException("Cette mission a déjà été évaluée");
    }

    return this.prisma.review.create({
      data: {
        missionId,
        freelanceId: mission.freelanceId,
        clientId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        freelance: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        mission: { select: { id: true } },
      },
    });
  }

  /**
   * Retourne tous les avis d'un freelance + note moyenne dynamique.
   */
  async getFreelanceReviews(freelanceId: string) {
    const [reviews, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { freelanceId },
        include: {
          client: { select: { id: true, name: true } },
          mission: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.aggregate({
        where: { freelanceId },
        _avg: { rating: true },
        _count: { rating: true },
        _min: { rating: true },
        _max: { rating: true },
      }),
    ]);

    return {
      reviews,
      stats: {
        averageRating: stats._avg.rating
          ? Math.round(stats._avg.rating * 10) / 10
          : null,
        totalReviews: stats._count.rating,
        minRating: stats._min.rating,
        maxRating: stats._max.rating,
      },
    };
  }

  /**
   * Retourne une évaluation par son ID.
   */
  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        freelance: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        mission: { select: { id: true } },
      },
    });
    if (!review) throw new NotFoundException("Évaluation introuvable");
    return review;
  }
}

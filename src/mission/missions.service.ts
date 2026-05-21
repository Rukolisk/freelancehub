import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateMissionDto,
  UpdateMissionStatusDto,
  MissionQueryDto,
} from "./dto/missions.dto";
import { MissionStatus, Role } from "../common/types";
import { isTransitionAllowed } from "./transition/missions-transitions";

/**
 * Gestion du cycle de vie des missions.
 *
 * Règles métier clés :
 * - Seul un CLIENT peut créer une mission (souscrire à un service)
 * - Les transitions de statut sont contrôlées via `isTransitionAllowed`
 * - Chaque changement de statut génère automatiquement un MissionLog
 * - L'accès aux missions est scopé par rôle (CLIENT voit les siennes, etc.)
 */
@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Le client souscrit à un service → crée une mission PENDING.
   */
  async create(dto: CreateMissionDto, clientId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) throw new NotFoundException("Service introuvable");
    if (!service.isActive)
      throw new BadRequestException("Ce service n'est plus actif");
    if (service.freelanceId === clientId) {
      throw new ForbiddenException(
        "Vous ne pouvez pas souscrire à votre propre service",
      );
    }

    const mission = await this.prisma.mission.create({
      data: {
        serviceId: dto.serviceId,
        clientId,
        freelanceId: service.freelanceId,
        notes: dto.notes,
        status: MissionStatus.PENDING,
      },
      include: this.defaultIncludes(),
    });

    await this.logTransition(
      mission.id,
      null,
      MissionStatus.PENDING,
      clientId,
      "Mission créée",
    );
    return mission;
  }

  /**
   * Liste les missions accessibles selon le rôle de l'utilisateur.
   * CLIENT → ses missions. FREELANCE → ses missions. ADMIN → toutes.
   */
  async findAll(userId: string, role: Role, query: MissionQueryDto) {
    const { status, cursor, limit = 10 } = query;
    const take = Math.min(Number(limit), 100);

    const where: any = {};
    if (status) where.status = status;
    if (role === Role.CLIENT) where.clientId = userId;
    else if (role === Role.FREELANCE) where.freelanceId = userId;

    const rows = await this.prisma.mission.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: this.defaultIncludes(),
    });

    const hasNextPage = rows.length > take;
    const data = hasNextPage ? rows.slice(0, take) : rows;

    return {
      data,
      pagination: {
        limit: take,
        nextCursor: hasNextPage ? data[data.length - 1].id : null,
        hasNextPage,
      },
    };
  }

  /**
   * Retourne une mission. Seuls les participants ou les admins peuvent y accéder.
   */
  async findOne(id: string, userId: string, role: Role) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: {
        ...this.defaultIncludes(),
        logs: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!mission) throw new NotFoundException("Mission introuvable");

    if (
      role !== Role.ADMIN &&
      mission.clientId !== userId &&
      mission.freelanceId !== userId
    ) {
      throw new ForbiddenException("Vous n'avez pas accès à cette mission");
    }

    return mission;
  }

  /**
   * Change le statut d'une mission.
   * La transition est validée via `isTransitionAllowed` selon rôle + état courant.
   */
  async updateStatus(
    id: string,
    dto: UpdateMissionStatusDto,
    userId: string,
    role: Role,
  ) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException("Mission introuvable");

    // Vérification de l'appartenance pour les non-admins
    if (role === Role.FREELANCE && mission.freelanceId !== userId) {
      throw new ForbiddenException("Cette mission ne vous est pas assignée");
    }
    if (role === Role.CLIENT && mission.clientId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas le client de cette mission",
      );
    }

    const currentStatus = mission.status as MissionStatus;

    // Guard de transition
    if (!isTransitionAllowed(currentStatus, dto.status, role)) {
      throw new ForbiddenException(
        `Transition "${currentStatus}" → "${dto.status}" non autorisée pour le rôle ${role}`,
      );
    }

    const updateData: any = { status: dto.status };
    if (dto.status === MissionStatus.IN_PROGRESS)
      updateData.startedAt = new Date();
    if (dto.status === MissionStatus.COMPLETED)
      updateData.completedAt = new Date();

    const updated = await this.prisma.mission.update({
      where: { id },
      data: updateData,
      include: this.defaultIncludes(),
    });

    await this.logTransition(
      id,
      currentStatus,
      dto.status,
      userId,
      dto.comment,
    );
    return updated;
  }

  /**
   * Journal des changements de statut d'une mission.
   */
  async getLogs(id: string, userId: string, role: Role) {
    await this.findOne(id, userId, role); // vérification accès
    return this.prisma.missionLog.findMany({
      where: { missionId: id },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Journalise automatiquement une transition de statut.
   */
  private async logTransition(
    missionId: string,
    fromStatus: MissionStatus | null,
    toStatus: MissionStatus,
    changedBy: string,
    comment?: string,
  ) {
    return this.prisma.missionLog.create({
      data: { missionId, fromStatus, toStatus, changedBy, comment },
    });
  }

  private defaultIncludes() {
    return {
      service: {
        select: { id: true, title: true, price: true, category: true },
      },
      client: { select: { id: true, name: true, email: true } },
      freelance: { select: { id: true, name: true, email: true } },
      review: true,
    };
  }
}

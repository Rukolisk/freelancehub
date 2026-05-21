import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MissionExportQueryDto } from "./dto/admin.dto";
import { Role } from "../common/types";
import * as crypto from "crypto";

// csv-stringify/sync et csv-parse/sync - fallback sur implémentation manuelle si besoin
let stringify: any;
let parse: any;

try {
  stringify = require("csv-stringify/sync").stringify;
  parse = require("csv-parse/sync").parse;
} catch {
  // Implémentation CSV minimale si les packages ne sont pas disponibles
  stringify = (records: any[], opts: any) => {
    if (!records.length) return "";
    const headers = opts?.header ? Object.keys(records[0]) : [];
    const rows = records.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    return (headers.length ? [headers.join(","), ...rows] : rows).join("\n");
  };
  parse = (buffer: Buffer, opts: any) => {
    const lines = buffer
      .toString()
      .split("\n")
      .filter((l) => l.trim());
    if (!lines.length) return [];
    const headers = lines[0]
      .split(",")
      .map((h: string) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line
        .split(",")
        .map((v: string) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(
        headers.map((h: string, i: number) => [h, values[i] ?? ""]),
      );
    });
  };
}

/**
 * Service d'administration : dashboard stats, export/import CSV.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard de statistiques globales via agrégations Prisma.
   */
  async getDashboardStats() {
    const [
      totalUsers,
      usersByRole,
      totalServices,
      activeServices,
      totalMissions,
      missionsByStatus,
      avgServicePrice,
      totalReviews,
      avgRating,
      recentMissions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ["role"], _count: true }),
      this.prisma.service.count(),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.mission.count(),
      this.prisma.mission.groupBy({ by: ["status"], _count: true }),
      this.prisma.service.aggregate({ _avg: { price: true } }),
      this.prisma.review.count(),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
      this.prisma.mission.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true, email: true } },
          freelance: { select: { name: true, email: true } },
          service: { select: { title: true, price: true } },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
      },
      services: {
        total: totalServices,
        active: activeServices,
        averagePrice: avgServicePrice._avg.price
          ? Math.round(avgServicePrice._avg.price * 100) / 100
          : 0,
      },
      missions: {
        total: totalMissions,
        byStatus: Object.fromEntries(
          missionsByStatus.map((m) => [m.status, m._count]),
        ),
      },
      reviews: {
        total: totalReviews,
        averageRating: avgRating._avg.rating
          ? Math.round(avgRating._avg.rating * 10) / 10
          : null,
      },
      recentMissions,
    };
  }

  /**
   * Export CSV filtré des missions.
   */
  async exportMissionsCsv(query: MissionExportQueryDto): Promise<string> {
    const { status, startDate, endDate, freelanceId } = query;

    const where: any = {};
    if (status) where.status = status;
    if (freelanceId) where.freelanceId = freelanceId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const missions = await this.prisma.mission.findMany({
      where,
      include: {
        service: { select: { title: true, price: true, category: true } },
        client: { select: { name: true, email: true } },
        freelance: { select: { name: true, email: true } },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const records = missions.map((m) => ({
      id: m.id,
      status: m.status,
      serviceTitle: m.service.title,
      serviceCategory: m.service.category,
      servicePrice: m.service.price,
      clientName: m.client.name,
      clientEmail: m.client.email,
      freelanceName: m.freelance.name,
      freelanceEmail: m.freelance.email,
      notes: m.notes ?? "",
      reviewRating: m.review?.rating ?? "",
      reviewComment: m.review?.comment ?? "",
      startedAt: m.startedAt?.toISOString() ?? "",
      completedAt: m.completedAt?.toISOString() ?? "",
      createdAt: m.createdAt.toISOString(),
    }));

    return stringify(records, { header: true });
  }

  /**
   * Import CSV de freelances.
   * Colonnes attendues : email, name, bio (optionnel)
   * Retourne un rapport détaillé.
   */
  async importFreelancesCsv(buffer: Buffer) {
    let records: any[];

    try {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException("Fichier CSV invalide ou mal formaté");
    }

    const report = {
      total: records.length,
      created: 0,
      skipped: 0,
      errors: [] as { row: number; email: string; reason: string }[],
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      if (!row.email?.trim() || !row.name?.trim()) {
        report.errors.push({
          row: rowNum,
          email: row.email ?? "N/A",
          reason: "Champs requis manquants (email, name)",
        });
        continue;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        report.errors.push({
          row: rowNum,
          email: row.email,
          reason: "Email invalide",
        });
        continue;
      }

      try {
        const existing = await this.prisma.user.findUnique({
          where: { email: row.email },
        });
        if (existing) {
          report.skipped++;
          report.errors.push({
            row: rowNum,
            email: row.email,
            reason: "Email déjà utilisé (compte ignoré)",
          });
          continue;
        }

        // Mot de passe temporaire — l'utilisateur devra le réinitialiser
        const tempPassword = crypto.randomBytes(12).toString("hex");

        await this.prisma.user.create({
          data: {
            email: row.email.trim(),
            name: row.name.trim(),
            bio: row.bio?.trim() || null,
            role: Role.FREELANCE,
            emailVerified: false,
          },
        });

        report.created++;
      } catch {
        report.errors.push({
          row: rowNum,
          email: row.email,
          reason: "Erreur lors de la création en base",
        });
      }
    }

    return report;
  }

  /**
   * Liste tous les utilisateurs (filtre optionnel par rôle).
   */
  async getUsers(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            services: true,
            missionsAsFreelance: true,
            missionsAsClient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

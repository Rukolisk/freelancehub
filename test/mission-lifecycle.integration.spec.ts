import { Test, TestingModule } from "@nestjs/testing";
import { MissionsService } from "../src/mission/missions.service";
import { ReviewsService } from "../src/review/reviews.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { MissionStatus, Role } from "../src/common/types";
import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

/**
 * Test d'intégration : scénario complet du cycle de vie d'une mission.
 *
 * Scénario:
 * 1. CLIENT crée la mission (PENDING)
 * 2. FREELANCE accepte (ACCEPTED)
 * 3. FREELANCE commence (IN_PROGRESS)
 * 4. FREELANCE complète (COMPLETED)
 * 5. CLIENT évalue (Review)
 *
 * + Tests négatifs (guards)
 */
describe("Mission Lifecycle — Integration", () => {
  let missionsService: MissionsService;
  let reviewsService: ReviewsService;

  const mockSvc = {
    id: "svc-1",
    title: "Dev API NestJS",
    price: 800,
    category: "Backend",
    freelanceId: "freelance-1",
    isActive: true,
  };

  const buildMission = (status: MissionStatus, extra: any = {}) => ({
    id: "mission-1",
    status,
    serviceId: "svc-1",
    clientId: "client-1",
    freelanceId: "freelance-1",
    notes: "Livraison sous 7 jours",
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    service: {
      id: "svc-1",
      title: "Dev API NestJS",
      price: 800,
      category: "Backend",
    },
    client: { id: "client-1", name: "Alice", email: "alice@test.com" },
    freelance: { id: "freelance-1", name: "Bob", email: "bob@test.com" },
    review: null,
    logs: [],
    ...extra,
  });

  const prisma = {
    service: { findUnique: jest.fn() },
    mission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    missionLog: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    review: { create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.missionLog.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    missionsService = module.get(MissionsService);
    reviewsService = module.get(ReviewsService);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("[1] CLIENT crée la mission → statut PENDING + log créé", async () => {
    prisma.service.findUnique.mockResolvedValue(mockSvc);
    prisma.mission.create.mockResolvedValue(
      buildMission(MissionStatus.PENDING),
    );

    const m = await missionsService.create(
      { serviceId: "svc-1", notes: "ASAP" },
      "client-1",
    );

    expect(m.status).toBe(MissionStatus.PENDING);
    expect(m.clientId).toBe("client-1");
    expect(m.freelanceId).toBe("freelance-1");
    expect(prisma.missionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toStatus: MissionStatus.PENDING,
          fromStatus: null,
        }),
      }),
    );
  });

  it("[2] FREELANCE accepte → PENDING→ACCEPTED", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.PENDING),
    );
    prisma.mission.update.mockResolvedValue(
      buildMission(MissionStatus.ACCEPTED),
    );

    const m = await missionsService.updateStatus(
      "mission-1",
      { status: MissionStatus.ACCEPTED },
      "freelance-1",
      Role.FREELANCE,
    );
    expect(m.status).toBe(MissionStatus.ACCEPTED);
    expect(prisma.missionLog.create).toHaveBeenCalled();
  });

  it("[3] FREELANCE démarre → ACCEPTED→IN_PROGRESS + startedAt", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.ACCEPTED),
    );
    prisma.mission.update.mockResolvedValue(
      buildMission(MissionStatus.IN_PROGRESS, { startedAt: new Date() }),
    );

    await missionsService.updateStatus(
      "mission-1",
      { status: MissionStatus.IN_PROGRESS },
      "freelance-1",
      Role.FREELANCE,
    );
    expect(prisma.mission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startedAt: expect.any(Date) }),
      }),
    );
  });

  it("[4] FREELANCE complète → IN_PROGRESS→COMPLETED + completedAt", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.IN_PROGRESS),
    );
    prisma.mission.update.mockResolvedValue(
      buildMission(MissionStatus.COMPLETED, { completedAt: new Date() }),
    );

    await missionsService.updateStatus(
      "mission-1",
      { status: MissionStatus.COMPLETED },
      "freelance-1",
      Role.FREELANCE,
    );
    expect(prisma.mission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completedAt: expect.any(Date) }),
      }),
    );
  });

  it("[5] CLIENT évalue la mission COMPLETED", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.COMPLETED, { review: null }),
    );
    prisma.review.create.mockResolvedValue({
      id: "rev-1",
      missionId: "mission-1",
      freelanceId: "freelance-1",
      clientId: "client-1",
      rating: 5,
      comment: "Parfait!",
      createdAt: new Date(),
      freelance: { id: "freelance-1", name: "Bob" },
      client: { id: "client-1", name: "Alice" },
      mission: { id: "mission-1" },
    });

    const rev = await reviewsService.create(
      "mission-1",
      { rating: 5, comment: "Parfait!" },
      "client-1",
    );
    expect(rev.rating).toBe(5);
    expect(rev.missionId).toBe("mission-1");
  });

  // ── Guards négatifs ─────────────────────────────────────────────────────────

  it("[Guard] FREELANCE ne peut pas sauter PENDING→COMPLETED", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.PENDING),
    );
    await expect(
      missionsService.updateStatus(
        "mission-1",
        { status: MissionStatus.COMPLETED },
        "freelance-1",
        Role.FREELANCE,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("[Guard] CLIENT ne peut pas accepter une mission", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.PENDING),
    );
    await expect(
      missionsService.updateStatus(
        "mission-1",
        { status: MissionStatus.ACCEPTED },
        "client-1",
        Role.CLIENT,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("[Guard] Impossible d'évaluer une mission IN_PROGRESS", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.IN_PROGRESS, { review: null }),
    );
    await expect(
      reviewsService.create("mission-1", { rating: 5 }, "client-1"),
    ).rejects.toThrow(BadRequestException);
  });

  it("[Guard] Impossible de double-évaluer une mission", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.COMPLETED, { review: { id: "existing-rev" } }),
    );
    await expect(
      reviewsService.create("mission-1", { rating: 4 }, "client-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("[Guard] CLIENT ne peut pas agir sur la mission d'un autre client", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.PENDING),
    );
    await expect(
      missionsService.updateStatus(
        "mission-1",
        { status: MissionStatus.CANCELLED },
        "other-client",
        Role.CLIENT,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("[Guard] ADMIN peut résoudre un litige DISPUTED→CANCELLED", async () => {
    prisma.mission.findUnique.mockResolvedValue(
      buildMission(MissionStatus.DISPUTED),
    );
    prisma.mission.update.mockResolvedValue(
      buildMission(MissionStatus.CANCELLED),
    );

    const m = await missionsService.updateStatus(
      "mission-1",
      { status: MissionStatus.CANCELLED, comment: "Fraude détectée" },
      "admin-1",
      Role.ADMIN,
    );
    expect(m.status).toBe(MissionStatus.CANCELLED);
  });
});

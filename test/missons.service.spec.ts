import { Test, TestingModule } from "@nestjs/testing";
import { MissionsService } from "../src/mission/missions.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { MissionStatus, Role } from "../src/common/types";

const mockMission = {
  id: "mission-1",
  status: MissionStatus.PENDING,
  serviceId: "svc-1",
  clientId: "client-1",
  freelanceId: "freelance-1",
  notes: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  service: { id: "svc-1", title: "Dev API", price: 500, category: "Dev" },
  client: { id: "client-1", name: "Alice", email: "alice@test.com" },
  freelance: { id: "freelance-1", name: "Bob", email: "bob@test.com" },
  review: null,
};

const mockService = {
  id: "svc-1",
  freelanceId: "freelance-1",
  isActive: true,
  title: "Dev API",
  price: 500,
  category: "Dev",
};

describe("MissionsService", () => {
  let service: MissionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      service: { findUnique: jest.fn() },
      mission: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      missionLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("crée une mission PENDING quand un client souscrit à un service actif", async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.mission.create.mockResolvedValue(mockMission);

      const result = await service.create({ serviceId: "svc-1" }, "client-1");

      expect(result.status).toBe(MissionStatus.PENDING);
      expect(prisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: "client-1",
            freelanceId: "freelance-1",
            status: MissionStatus.PENDING,
          }),
        }),
      );
      expect(prisma.missionLog.create).toHaveBeenCalled();
    });

    it("lève NotFoundException si le service n'existe pas", async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ serviceId: "nope" }, "client-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève BadRequestException si le service est inactif", async () => {
      prisma.service.findUnique.mockResolvedValue({
        ...mockService,
        isActive: false,
      });
      await expect(
        service.create({ serviceId: "svc-1" }, "client-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève ForbiddenException si le freelance souscrit à son propre service", async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      await expect(
        service.create({ serviceId: "svc-1" }, "freelance-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────────

  describe("updateStatus", () => {
    it("FREELANCE peut accepter une mission PENDING", async () => {
      prisma.mission.findUnique.mockResolvedValue(mockMission);
      prisma.mission.update.mockResolvedValue({
        ...mockMission,
        status: MissionStatus.ACCEPTED,
      });

      const result = await service.updateStatus(
        "mission-1",
        { status: MissionStatus.ACCEPTED },
        "freelance-1",
        Role.FREELANCE,
      );
      expect(result.status).toBe(MissionStatus.ACCEPTED);
    });

    it("CLIENT peut annuler une mission PENDING", async () => {
      prisma.mission.findUnique.mockResolvedValue(mockMission);
      prisma.mission.update.mockResolvedValue({
        ...mockMission,
        status: MissionStatus.CANCELLED,
      });

      const result = await service.updateStatus(
        "mission-1",
        { status: MissionStatus.CANCELLED },
        "client-1",
        Role.CLIENT,
      );
      expect(result.status).toBe(MissionStatus.CANCELLED);
    });

    it("lève ForbiddenException pour une transition invalide (PENDING→COMPLETED)", async () => {
      prisma.mission.findUnique.mockResolvedValue(mockMission);
      await expect(
        service.updateStatus(
          "mission-1",
          { status: MissionStatus.COMPLETED },
          "freelance-1",
          Role.FREELANCE,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève ForbiddenException si le mauvais freelance essaie d'agir", async () => {
      prisma.mission.findUnique.mockResolvedValue(mockMission);
      await expect(
        service.updateStatus(
          "mission-1",
          { status: MissionStatus.ACCEPTED },
          "impostor",
          Role.FREELANCE,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève ForbiddenException si le mauvais client essaie d'annuler", async () => {
      prisma.mission.findUnique.mockResolvedValue(mockMission);
      await expect(
        service.updateStatus(
          "mission-1",
          { status: MissionStatus.CANCELLED },
          "bad-client",
          Role.CLIENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException pour une mission inexistante", async () => {
      prisma.mission.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus(
          "nope",
          { status: MissionStatus.ACCEPTED },
          "freelance-1",
          Role.FREELANCE,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("définit startedAt lors du passage à IN_PROGRESS", async () => {
      const accepted = { ...mockMission, status: MissionStatus.ACCEPTED };
      prisma.mission.findUnique.mockResolvedValue(accepted);
      prisma.mission.update.mockResolvedValue({
        ...accepted,
        status: MissionStatus.IN_PROGRESS,
        startedAt: new Date(),
      });

      await service.updateStatus(
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

    it("définit completedAt lors du passage à COMPLETED", async () => {
      const inProgress = { ...mockMission, status: MissionStatus.IN_PROGRESS };
      prisma.mission.findUnique.mockResolvedValue(inProgress);
      prisma.mission.update.mockResolvedValue({
        ...inProgress,
        status: MissionStatus.COMPLETED,
        completedAt: new Date(),
      });

      await service.updateStatus(
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

    it("ADMIN peut résoudre un litige (DISPUTED→COMPLETED)", async () => {
      const disputed = { ...mockMission, status: MissionStatus.DISPUTED };
      prisma.mission.findUnique.mockResolvedValue(disputed);
      prisma.mission.update.mockResolvedValue({
        ...disputed,
        status: MissionStatus.COMPLETED,
      });

      const result = await service.updateStatus(
        "mission-1",
        { status: MissionStatus.COMPLETED },
        "admin-id",
        Role.ADMIN,
      );
      expect(result.status).toBe(MissionStatus.COMPLETED);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe("findOne", () => {
    const missionWithLogs = { ...mockMission, logs: [] };

    it("retourne la mission pour son client", async () => {
      prisma.mission.findUnique.mockResolvedValue(missionWithLogs);
      const r = await service.findOne("mission-1", "client-1", Role.CLIENT);
      expect(r.id).toBe("mission-1");
    });

    it("retourne la mission pour son freelance", async () => {
      prisma.mission.findUnique.mockResolvedValue(missionWithLogs);
      const r = await service.findOne(
        "mission-1",
        "freelance-1",
        Role.FREELANCE,
      );
      expect(r.id).toBe("mission-1");
    });

    it("retourne la mission pour un ADMIN", async () => {
      prisma.mission.findUnique.mockResolvedValue(missionWithLogs);
      const r = await service.findOne("mission-1", "admin-x", Role.ADMIN);
      expect(r.id).toBe("mission-1");
    });

    it("lève ForbiddenException pour un utilisateur non-participant", async () => {
      prisma.mission.findUnique.mockResolvedValue(missionWithLogs);
      await expect(
        service.findOne("mission-1", "rando", Role.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si la mission n'existe pas", async () => {
      prisma.mission.findUnique.mockResolvedValue(null);
      await expect(
        service.findOne("nope", "client-1", Role.CLIENT),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

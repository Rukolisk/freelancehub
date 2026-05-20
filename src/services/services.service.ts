import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from "./dto/services.dto";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new service (freelance only)
   */
  async create(dto: CreateServiceDto, freelanceId: string) {
    return this.prisma.service.create({
      data: {
        ...dto,
        tags: dto.tags || [],
        freelanceId,
      },
      include: {
        freelance: {
          select: { id: true, name: true, email: true, bio: true },
        },
      },
    });
  }

  /**
   * List services with cursor-based pagination and multi-criteria filtering
   */
  async findAll(query: ServiceQueryDto) {
    const {
      search,
      category,
      tags,
      priceMin,
      priceMax,
      limit = 10,
      cursor,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    // Parse tags from string if not already array
    const tagsArray = Array.isArray(tags)
      ? tags
      : tags
        ? tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : undefined;

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { contains: category, mode: "insensitive" };
    }

    if (tagsArray && tagsArray.length > 0) {
      where.tags = { hasSome: tagsArray };
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {};
      if (priceMin !== undefined) where.price.gte = priceMin;
      if (priceMax !== undefined) where.price.lte = priceMax;
    }

    const validSortFields = ["price", "createdAt", "title"];
    const orderBy = validSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder }
      : { createdAt: sortOrder };

    const take = Math.min(limit, 100);

    const services = await this.prisma.service.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        freelance: {
          select: { id: true, name: true, bio: true },
        },
        _count: { select: { missions: true } },
      },
    });

    const hasNextPage = services.length > take;
    const data = hasNextPage ? services.slice(0, take) : services;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      pagination: {
        limit: take,
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Find a single service by ID
   */
  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        freelance: {
          select: { id: true, name: true, email: true, bio: true },
        },
        _count: { select: { missions: true } },
      },
    });

    if (!service) throw new NotFoundException("Service introuvable");
    return service;
  }

  /**
   * Update a service (owner only)
   */
  async update(id: string, dto: UpdateServiceDto, userId: string) {
    const service = await this.findOne(id);

    if (service.freelanceId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres services",
      );
    }

    return this.prisma.service.update({
      where: { id },
      data: { ...dto },
      include: {
        freelance: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Delete a service (owner only)
   */
  async remove(id: string, userId: string) {
    const service = await this.findOne(id);

    if (service.freelanceId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez supprimer que vos propres services",
      );
    }

    await this.prisma.service.delete({ where: { id } });
    return { message: "Service supprimé avec succès" };
  }

  /**
   * Get services for the authenticated freelance
   */
  async getMyServices(freelanceId: string) {
    return this.prisma.service.findMany({
      where: { freelanceId },
      include: {
        _count: { select: { missions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

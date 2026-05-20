import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware de logging des requêtes HTTP authentifiées.
 * Log : méthode, URL, statut, durée, userId (ou 'anonymous').
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const user = (req as any).user;
      const userId = user?.id ?? "anonymous";
      const { statusCode } = res;

      this.logger.log(
        `${method} ${originalUrl} [${statusCode}] ${duration}ms — user:${userId}`,
      );
    });

    next();
  }
}

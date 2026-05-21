import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

/**
 * Filtre global : intercepte toutes les exceptions et retourne
 * une réponse JSON structurée. Aucun 500 brut exposé au client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Erreur interne du serveur";
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const b = body as any;
        if (Array.isArray(b.message)) {
          errors = b.message;
          message = "Erreur de validation";
        } else {
          message = b.message ?? message;
        }
      }
    } else {
      this.logger.error("Unhandled exception", exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}

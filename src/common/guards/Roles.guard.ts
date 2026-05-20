import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../types";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Guard de rôle. Doit être utilisé APRÈS AuthGuard.
 * Le champ `role` est stocké dans `user.role` (Better Auth additionalField).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException("Accès refusé");

    if (!requiredRoles.includes(user.role as Role)) {
      throw new ForbiddenException(
        `Rôle requis : ${requiredRoles.join(" ou ")}. Votre rôle : ${user.role}`,
      );
    }

    return true;
  }
}

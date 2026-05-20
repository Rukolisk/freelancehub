import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Récupère l'utilisateur Better Auth depuis la requête.
 * Alimenté par AuthGuard qui appelle auth.api.getSession().
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

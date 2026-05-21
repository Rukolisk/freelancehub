import { MissionStatus, Role } from "src/common/types";

/**
 * Matrice des transitions autorisées par rôle et par état courant.
 *
 * Logique métier :
 * - FREELANCE : accepte, commence et complète les missions qui lui sont assignées
 * - CLIENT    : peut annuler avant démarrage, signaler un litige en cours
 * - ADMIN     : modération complète (résolution litiges, annulations forcées)
 */
export const ALLOWED_TRANSITIONS: Record<
  MissionStatus,
  Partial<Record<Role, MissionStatus[]>>
> = {
  [MissionStatus.PENDING]: {
    [Role.FREELANCE]: [MissionStatus.ACCEPTED, MissionStatus.CANCELLED],
    [Role.CLIENT]: [MissionStatus.CANCELLED],
    [Role.ADMIN]: [MissionStatus.CANCELLED],
  },
  [MissionStatus.ACCEPTED]: {
    [Role.FREELANCE]: [MissionStatus.IN_PROGRESS, MissionStatus.CANCELLED],
    [Role.CLIENT]: [MissionStatus.CANCELLED],
    [Role.ADMIN]: [MissionStatus.CANCELLED, MissionStatus.DISPUTED],
  },
  [MissionStatus.IN_PROGRESS]: {
    [Role.FREELANCE]: [MissionStatus.COMPLETED],
    [Role.CLIENT]: [MissionStatus.DISPUTED],
    [Role.ADMIN]: [
      MissionStatus.COMPLETED,
      MissionStatus.CANCELLED,
      MissionStatus.DISPUTED,
    ],
  },
  [MissionStatus.COMPLETED]: {
    [Role.ADMIN]: [MissionStatus.DISPUTED],
  },
  [MissionStatus.CANCELLED]: {},
  [MissionStatus.DISPUTED]: {
    [Role.ADMIN]: [MissionStatus.COMPLETED, MissionStatus.CANCELLED],
  },
};

export function isTransitionAllowed(
  from: MissionStatus,
  to: MissionStatus,
  role: Role,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.[role]?.includes(to) ?? false;
}

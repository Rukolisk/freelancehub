bash
cat > /home/claude/freelancehub_final/README.md << 'READMEEOF'

# FreelanceHub API

Backend NestJS — Plateforme de mise en relation freelances/clients.

## Stack

| Outil                            | Rôle                                                    |
| -------------------------------- | ------------------------------------------------------- |
| **NestJS 11**                    | Framework (modules, guards, pipes, middleware, filters) |
| **Better Auth**                  | Authentification email/password + sessions              |
| **@thallesp/nestjs-better-auth** | Intégration Better Auth ↔ NestJS                        |
| **Prisma 7**                     | ORM + migrations (adapter `PrismaPg`)                   |
| **PostgreSQL 16**                | Base de données                                         |
| **Swagger**                      | Documentation auto-générée (`/api/docs`)                |
| **Docker**                       | Conteneurisation complète                               |

---

## Démarrage rapide

### 1. Cloner & installer

```bash
git clone <repo>
cd freelancehub
npm install
cp .env.example .env
# Éditer .env : renseigner DATABASE_URL
```

### 2a. Avec Docker (recommandé)

```bash
docker-compose up -d
```

API sur `http://localhost:3000/api` | Swagger sur `http://localhost:3000/api/docs`

### 2b. Sans Docker

```bash
# PostgreSQL doit tourner en local
npm run db:generate    # génère le client Prisma
npm run db:migrate     # applique les migrations
npm run db:seed        # données initiales
npm run start:dev      # démarrage hot-reload
```

---

## Authentification — Better Auth

Les routes d'auth sont gérées par `@thallesp/nestjs-better-auth` sous `/api/auth/*`.

### Inscription

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "alice@company.com",
  "password": "Password1!",
  "name": "Alice Martin",
  "role": "CLIENT"          ← CLIENT | FREELANCE | ADMIN
}
```

### Connexion

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "alice@company.com",
  "password": "Password1!"
}
```

Réponse → `{ "token": "...", "user": { ... } }`

### Utiliser le token

```http
Authorization: Bearer <token>
```

### Autres routes Better Auth disponibles

| Route                            | Description        |
| -------------------------------- | ------------------ |
| `POST /api/auth/sign-out`        | Déconnexion        |
| `GET  /api/auth/get-session`     | Session courante   |
| `POST /api/auth/forget-password` | Reset mot de passe |

---

## Modules

### `ServicesModule` — `/api/services`

Offres de services créées par les freelances.

| Méthode  | Route           | Auth      | Description                             |
| -------- | --------------- | --------- | --------------------------------------- |
| `GET`    | `/services`     | Public    | Liste avec filtrage + pagination cursor |
| `GET`    | `/services/my`  | FREELANCE | Mes services                            |
| `GET`    | `/services/:id` | Public    | Détail                                  |
| `POST`   | `/services`     | FREELANCE | Créer                                   |
| `PUT`    | `/services/:id` | FREELANCE | Modifier (propriétaire)                 |
| `DELETE` | `/services/:id` | FREELANCE | Supprimer (propriétaire)                |

---

## Architecture

```
src/
├── main.ts                          # Bootstrap, Swagger, guards globaux
├── app.module.ts                    # Module racine + LoggingMiddleware
├── utils/auth.ts                    # Config Better Auth
├── prisma/                          # PrismaService (global via PrismaModule)
├── services/                        # CRUD offres freelance
└── common/
    ├── types.ts                     # Enums Role
    ├── guards/                      # AuthGuard (Better Auth), RolesGuard
    ├── pipes/                       # TagsTransformPipe
    ├── middleware/                  # LoggingMiddleware
    └──  decorators/                  # @CurrentUser(), @Roles()

prisma/
├── schema.prisma                    # Modèles BDD

└── migrations/                      # Migrations SQL
```

---

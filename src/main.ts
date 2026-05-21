import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // pour betterauth
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // retourne 400 si champ inconnu envoyé
      transform: true, // transforme automatiquement les types
    }),
  );
  const config = new DocumentBuilder()
    .setTitle("FreelanceHub API")
    .setDescription("Plateforme de mise en relation freelances/clients")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )
    .addTag("Auth", "Authentification et gestion de session")
    .addTag("Services", "Offres de services freelance")
    .addTag("Admin", "Administration — ADMIN uniquement")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`FreelanceHub API running on http://localhost:${port}/api`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();

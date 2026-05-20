import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // retourne 400 si champ inconnu envoyé
      transform: true, // transforme automatiquement les types
    }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

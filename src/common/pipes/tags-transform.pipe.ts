import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";

/**
 * Pipe de transformation des tags reçus en query string
 * Accepte une string "tag1,tag2,tag3" et retourne un tableau ["tag1", "tag2", "tag3"]
 */
@Injectable()
export class TagsTransformPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value || typeof value !== "object") return value;

    if (value.tags && typeof value.tags === "string") {
      value.tags = value.tags
        .split(",")
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);
    } else if (Array.isArray(value.tags)) {
      value.tags = value.tags
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);
    }

    value.tags = [...new Set(value.tags)];
    return value;
  }
}

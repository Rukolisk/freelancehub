import { TagsTransformPipe } from "../src/common/pipes/tags-transform.pipe";

describe("TagsTransformPipe", () => {
  let pipe: TagsTransformPipe;
  const meta = { type: "query" as const, metatype: Object, data: "" };

  beforeEach(() => {
    pipe = new TagsTransformPipe();
  });

  it('transforme "nestjs,typescript,api" en tableau', () => {
    const r = pipe.transform({ tags: "nestjs,typescript,api" }, meta);
    expect(r.tags).toEqual(["nestjs", "typescript", "api"]);
  });

  it("supprime les espaces superflus", () => {
    const r = pipe.transform({ tags: " nestjs , typescript " }, meta);
    expect(r.tags).toEqual(["nestjs", "typescript"]);
  });

  it("met en minuscules", () => {
    const r = pipe.transform({ tags: "NestJS,TypeScript" }, meta);
    expect(r.tags).toEqual(["nestjs", "typescript"]);
  });

  it("filtre les éléments vides", () => {
    const r = pipe.transform({ tags: "nestjs,,api," }, meta);
    expect(r.tags).toEqual(["nestjs", "api"]);
  });

  it("déduplique les tags", () => {
    const r = pipe.transform({ tags: "nestjs,nestjs,api" }, meta);
    expect(r.tags).toEqual(["nestjs", "api"]);
  });

  it("accepte un tableau en entrée", () => {
    const r = pipe.transform({ tags: ["NestJS", "TypeScript"] }, meta);
    expect(r.tags).toEqual(["nestjs", "typescript"]);
  });

  it("retourne un tableau vide pour une chaîne vide", () => {
    const r = pipe.transform({ tags: "" }, meta);
    expect(r.tags).toEqual([]);
  });

  it("ne touche pas aux autres champs", () => {
    const r = pipe.transform(
      { tags: "api", search: "test", priceMin: 50 },
      meta,
    );
    expect(r.search).toBe("test");
    expect(r.priceMin).toBe(50);
  });

  it("passe les valeurs null/undefined sans planter", () => {
    expect(pipe.transform(null, meta)).toBeNull();
    expect(pipe.transform(undefined, meta)).toBeUndefined();
  });

  it("n'ajoute pas de champ tags si absent", () => {
    const r = pipe.transform({ search: "api" }, meta);
    expect(r.tags).toEqual([]);
  });
});

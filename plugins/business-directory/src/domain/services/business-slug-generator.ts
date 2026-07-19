export class BusinessSlugGenerator {
  public static generate(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
      .replace(/[\s-]+/g, "-"); // Substitui espaços por hífens
  }
}

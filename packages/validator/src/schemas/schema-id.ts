export function canonicalSchemaId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || /\s/.test(value)) {
    throw new Error("Schema identity must be an absolute URI.");
  }
  const uri = new URL(value);
  if (uri.hash !== "")
    throw new Error("Schema identity must not contain a fragment.");
  return value.replace(/#$/, "");
}

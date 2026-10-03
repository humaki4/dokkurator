/** Invalid prepared configuration; separate from document findings. */
export class LintConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LintConfigurationError";
  }
}

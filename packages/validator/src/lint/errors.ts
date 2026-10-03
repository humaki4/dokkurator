/** Invalid prepared configuration; separate from document findings. */
export class LintConfigurationError extends Error {
  readonly source?: {
    readonly sourceId: string;
    readonly path: string;
    readonly revision?: string;
  };
  constructor(
    message: string,
    options?: ErrorOptions & { source?: LintConfigurationError["source"] },
  ) {
    super(message, options);
    this.name = "LintConfigurationError";
    this.source = options?.source;
  }
}

/** A plugin or engine failed after valid configuration; never a document result. */
export class LintRuntimeError extends Error {
  readonly source?: LintConfigurationError["source"];
  constructor(
    message: string,
    options?: ErrorOptions & { source?: LintConfigurationError["source"] },
  ) {
    super(message, options);
    this.name = "LintRuntimeError";
    this.source = options?.source;
  }
}

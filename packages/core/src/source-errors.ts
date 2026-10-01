import type {
  SourceOperationError,
  SourceOperationPhase,
  SourceRecovery,
} from "./types.js";

class SourceStageError extends Error {
  constructor(
    readonly phase: SourceOperationPhase,
    readonly recovery: SourceRecovery,
    options: ErrorOptions,
  ) {
    super(errorMessage(options.cause), options);
  }
}

/** Classifies an error raised by one stage of a source operation. */
export async function sourceStage<T>(
  phase: SourceOperationPhase,
  recovery: SourceRecovery,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new SourceStageError(phase, recovery, { cause: error });
  }
}

/** Converts an internal stage failure into the public per-source result. */
export function toSourceOperationError(
  sourceId: string,
  error: unknown,
): SourceOperationError {
  if (error instanceof SourceStageError)
    return {
      sourceId,
      phase: error.phase,
      message: error.message,
      recovery: error.recovery,
    };
  return {
    sourceId,
    phase: "preparation",
    message: errorMessage(error),
    recovery: "retry-operation",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

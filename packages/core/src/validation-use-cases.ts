import { loadDocTypes, loadDocuments } from "@dokkurator/loader";
import {
  lint,
  LintConfigurationError,
  prepareLintConfiguration,
} from "@dokkurator/validator";
import { sourceStage } from "./source-errors.js";
import {
  documentConfig,
  openProjectSource,
  processProjectSources,
} from "./source-operations.js";
import type { ApplicationContext } from "./application-context.js";
import type {
  SourceOperationResult,
  SourceSelection,
  ValidationSourceResult,
} from "./types.js";

/** Prepare source resources asynchronously, then lint each document synchronously. */
export async function validateProjectDocuments(
  { project }: ApplicationContext,
  options: SourceSelection = {},
): Promise<SourceOperationResult<ValidationSourceResult>> {
  return processProjectSources(project, options, async (source) => {
    const { adapter, config } = await openProjectSource(project, source);
    const docTypes = await sourceStage("load", "check-config", () =>
      loadDocTypes(adapter, { doctypesDirectory: config.doctypes.directory }),
    );
    const configuration = await sourceStage(
      "configuration",
      "check-config",
      async () => prepareLintConfiguration({ docTypes, ...config.validator }),
    );
    const documents = await sourceStage("load", "check-source", () =>
      loadDocuments(adapter, {
        ...documentConfig(config),
        parseErrors: "collect",
      }),
    );
    const results = [];
    for (const document of documents) {
      try {
        results.push({
          path: document.source.path,
          ...lint({
            originalText: document.originalText,
            source: document.source,
            configuration,
          }),
        });
      } catch (error) {
        await sourceStage(
          error instanceof LintConfigurationError
            ? "configuration"
            : "validation",
          error instanceof LintConfigurationError
            ? "check-config"
            : "retry-operation",
          async () => {
            throw error;
          },
        );
      }
    }
    return { sourceId: source.id, documents: results };
  });
}

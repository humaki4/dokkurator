import { ESLint } from "eslint";
import type {
  SourceOperationResult,
  ValidationFormatter,
  ValidationSourceResult,
} from "./types.js";

/** Supply captured rule metadata through ESLint's public metadata hook. */
class ReportESLint extends ESLint {
  constructor(
    readonly metadata: ReadonlyMap<
      ESLint.LintResult,
      ReturnType<ESLint["getRulesMetaForResults"]>
    >,
  ) {
    super({ overrideConfigFile: true });
  }

  override getRulesMetaForResults(results: ESLint.LintResult[]) {
    return Object.assign(
      {},
      ...results.map((result) => this.metadata.get(result) ?? {}),
    ) as ReturnType<ESLint["getRulesMetaForResults"]>;
  }
}

function fileResults(report: SourceOperationResult<ValidationSourceResult>) {
  return report.results.flatMap(({ documents }) =>
    documents.map(({ filePath, reporting }) => {
      const messages = structuredClone([...reporting.messages]);
      return {
        filePath,
        usedDeprecatedRules: structuredClone(reporting.usedDeprecatedRules),
        messages,
        suppressedMessages: structuredClone([...reporting.suppressedMessages]),
        errorCount: messages.filter(({ severity }) => severity === 2).length,
        warningCount: messages.filter(({ severity }) => severity === 1).length,
        fatalErrorCount: messages.filter(({ fatal }) => fatal).length,
        fixableErrorCount: messages.filter(
          ({ severity, fix }) => severity === 2 && fix,
        ).length,
        fixableWarningCount: messages.filter(
          ({ severity, fix }) => severity === 1 && fix,
        ).length,
      } satisfies ESLint.LintResult;
    }),
  );
}

export async function loadValidationFormatter(
  name = "stylish",
): Promise<ValidationFormatter> {
  if (!["stylish", "json", "json-with-metadata", "html"].includes(name)) {
    throw new Error(`Unsupported validation formatter: ${name}`);
  }
  // Resolve the built-in now so loading errors belong to loadFormatter().
  await new ESLint({ overrideConfigFile: true }).loadFormatter(name);
  return {
    async format(report) {
      const documents = report.results.flatMap(({ documents }) => documents);
      const results = fileResults(report);
      const eslint = new ReportESLint(
        new Map(
          results.map((result, index) => [
            result,
            documents[index]!.reporting.rulesMeta,
          ]),
        ),
      );
      const formatter = await eslint.loadFormatter(name);
      const output = await formatter.format(results);
      if (name === "json" || name === "json-with-metadata") {
        const formatted: unknown = JSON.parse(output);
        return JSON.stringify({
          ...(name === "json" ? { results: formatted } : (formatted as object)),
          sources: report.results.map(({ sourceId, documents }) => ({
            sourceId,
            documents: documents.map(
              ({
                path,
                filePath,
                diagnostics,
                suppressedDiagnostics,
                reporting,
              }) => ({
                path,
                filePath,
                diagnostics,
                suppressedDiagnostics,
                ...(name === "json-with-metadata"
                  ? { rulesMeta: reporting.rulesMeta }
                  : {}),
              }),
            ),
          })),
          errors: report.errors,
        });
      }
      if (!report.errors.length) return output;
      const errors = report.errors
        .map(
          ({ sourceId, phase, recovery, message }) =>
            `${sourceId} (${phase}, ${recovery}): ${message}`,
        )
        .join("\n");
      if (name === "html") {
        const escaped = errors
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
        return output.replace(
          "</body>",
          `<h2>Operational errors</h2><pre>${escaped}</pre></body>`,
        );
      }
      return `${output}\nOperational errors\n${errors}\n`;
    },
  };
}

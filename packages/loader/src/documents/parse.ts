import type {
  Heading as MarkdownHeading,
  Link as MarkdownLink,
  LinkReference as MarkdownLinkReference,
  Root,
  Yaml,
} from "mdast";
import { toString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { parseDocument as parseYamlDocument } from "yaml";
import type { SourceDocument } from "../source-adapter/source-adapter.js";
import type {
  Heading,
  DocumentParseDiagnostic,
  DocumentParseOptions,
  Link,
  ParsedDocument,
  Reference,
  SourcePosition,
} from "./types.js";

const markdownParser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, "yaml");

export class DocumentParseError extends Error {
  constructor(
    message: string,
    readonly sourcePath: string,
    options?: ErrorOptions,
  ) {
    super(`${sourcePath}: ${message}`, options);
    this.name = "DocumentParseError";
  }
}

export function parseDocument(
  source: SourceDocument,
  options: DocumentParseOptions = {},
): ParsedDocument {
  const ast = markdownParser.parse(source.content);
  // micromark discards the initial BOM before calculating positions.
  if (source.content.startsWith("\uFEFF")) {
    visit(ast, (node) => {
      if (!node.position) return;
      for (const point of [node.position.start, node.position.end]) {
        if (point.offset !== undefined) point.offset += 1;
        if (point.line === 1) point.column += 1;
      }
    });
  }
  const frontmatter = ast.children.find(isYamlFrontmatter);
  const { metadata, diagnostics } = frontmatter
    ? parseFrontmatter(frontmatter, source, options)
    : { metadata: undefined, diagnostics: [] };
  const content = extractMarkdownContent(source.content, frontmatter);
  const headings: Heading[] = [];
  const links: Link[] = [];
  const references: Reference[] = [];

  visit(ast, "heading", (node) => {
    headings.push(toHeading(node));
  });
  visit(ast, "link", (node) => {
    links.push(toLink(node));
  });
  visit(ast, "linkReference", (node) => {
    references.push(toReference(node));
  });

  return {
    type: getDocumentType(metadata),
    metadata,
    originalText: source.content,
    parseDiagnostics: diagnostics,
    content,
    ast,
    headings,
    links,
    references,
    source: source.source,
  };
}

function extractMarkdownContent(source: string, frontmatter: Yaml | undefined) {
  const endOffset = frontmatter?.position?.end.offset;
  if (endOffset === undefined) return source;

  return source.slice(endOffset).replace(/^(?:\r\n|\r|\n)/, "");
}

export function parseDocuments(
  sources: readonly SourceDocument[],
  options: DocumentParseOptions = {},
): ParsedDocument[] {
  return sources.map((source) => parseDocument(source, options));
}

function isYamlFrontmatter(node: Root["children"][number]): node is Yaml {
  return node.type === "yaml";
}

function parseFrontmatter(
  frontmatter: Yaml,
  source: SourceDocument,
  options: DocumentParseOptions,
): { metadata: unknown; diagnostics: DocumentParseDiagnostic[] } {
  const position = frontmatter.position!;
  const opening = source.content
    .slice(position.start.offset)
    .match(/^[^\r\n]*(?:\r\n|\r|\n)/)![0];
  const start = position.start.offset! + opening.length;
  const end = position.end.offset! - position.end.column + 1;
  // Parse the original slice so CRLF offsets are not normalized by the Markdown AST.
  const yaml = parseYamlDocument(
    source.content.slice(start, end).replace(/\r(?!\n)/g, "\n"),
    { prettyErrors: false },
  );
  if (yaml.errors.length > 0) {
    if (options.parseErrors !== "collect") {
      throw new DocumentParseError("Invalid YAML frontmatter", source.path, {
        cause: yaml.errors[0],
      });
    }
    return {
      metadata: undefined,
      diagnostics: yaml.errors.map((error) => ({
        phase: "parse",
        code: error.code,
        severity: "error",
        message: error.message,
        source: source.source,
        position: {
          start: sourcePoint(source.content, start + error.pos[0]),
          end: sourcePoint(source.content, start + error.pos[1]),
        },
      })),
    };
  }
  return { metadata: yaml.toJS(), diagnostics: [] };
}

function sourcePoint(text: string, offset: number): SourcePosition["start"] {
  const prefix = text.slice(0, offset);
  const lines = prefix.split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines.at(-1)!.length + 1, offset };
}

function getDocumentType(metadata: unknown): string | undefined {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "doctype" in metadata &&
    typeof metadata.doctype === "string"
  ) {
    return metadata.doctype;
  }

  return undefined;
}

function toHeading(node: MarkdownHeading): Heading {
  return withPosition(
    { depth: node.depth, text: toString(node) },
    node.position,
  );
}

function toLink(node: MarkdownLink): Link {
  return withPosition(
    {
      url: node.url,
      text: toString(node),
      ...(node.title === null ? {} : { title: node.title }),
    },
    node.position,
  );
}

function toReference(node: MarkdownLinkReference): Reference {
  return withPosition(
    {
      identifier: node.identifier,
      ...(node.label == null ? {} : { label: node.label }),
      text: toString(node),
      referenceType: node.referenceType,
    },
    node.position,
  );
}

function withPosition<T extends object>(
  value: T,
  position: SourcePosition | undefined,
): T & { position?: SourcePosition } {
  return position ? { ...value, position } : value;
}

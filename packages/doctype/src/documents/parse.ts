import type {
  Heading as MarkdownHeading,
  Link as MarkdownLink,
  LinkReference as MarkdownLinkReference,
  Root,
  YAML,
} from "mdast";
import { toString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";
import type { SourceDocument } from "../source-adapter.js";
import type {
  Heading,
  Link,
  ParsedDocument,
  Reference,
  SourcePosition,
} from "./types.js";

const markdownParser = unified()
  .use(remarkParse)
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

export function parseDocument(source: SourceDocument): ParsedDocument {
  const ast = markdownParser.parse(source.content);
  const frontmatter = ast.children.find(isYamlFrontmatter);
  const metadata = frontmatter
    ? parseFrontmatter(frontmatter, source.path)
    : undefined;
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
    content,
    ast,
    headings,
    links,
    references,
    source: source.source,
  };
}

function extractMarkdownContent(source: string, frontmatter: YAML | undefined) {
  const endOffset = frontmatter?.position?.end.offset;
  if (endOffset === undefined) return source;

  return source.slice(endOffset).replace(/^\r?\n/, "");
}

export function parseDocuments(
  sources: readonly SourceDocument[],
): ParsedDocument[] {
  return sources.map(parseDocument);
}

function isYamlFrontmatter(node: Root["children"][number]): node is YAML {
  return node.type === "yaml";
}

function parseFrontmatter(frontmatter: YAML, sourcePath: string): unknown {
  try {
    return parseYaml(frontmatter.value);
  } catch (error) {
    throw new DocumentParseError("Invalid YAML frontmatter", sourcePath, {
      cause: error,
    });
  }
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

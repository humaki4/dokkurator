import type { Linter } from "eslint";

/** Imported ESLint plugins and explicit rule activation, resolved per source. */
export interface ValidatorConfig {
  readonly schemas?: Readonly<
    Record<string, boolean | Readonly<Record<string, unknown>>>
  >;
  readonly plugins?: NonNullable<Linter.Config["plugins"]>;
  readonly rules?: Linter.RulesRecord;
}

export interface ResolvedValidatorConfig {
  readonly schemas: Readonly<
    Record<string, boolean | Readonly<Record<string, unknown>>>
  >;
  readonly plugins: NonNullable<Linter.Config["plugins"]>;
  readonly rules: Linter.RulesRecord;
}

/** Document discovery settings shared by project and source repositories. */
type DocumentsConfig = {
  readonly directory?: string;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
};

/** Directory containing DocType definitions within a repository. */
type DocTypeConfig = {
  readonly directory?: string;
};

/** One local or managed remote source declared by the project. */
export type SourceConfig = {
  readonly id: string;
  readonly path?: string;
  readonly remote?: { readonly url: string; readonly branch?: string };
};

/** Project config; documents and doctypes also configure the root repository. */
export type DokkuratorConfig = {
  readonly version?: 1;
  readonly documents?: DocumentsConfig;
  readonly doctypes?: DocTypeConfig;
  readonly validator?: ValidatorConfig;
  readonly knowledge?: { readonly index?: string };
  readonly checkouts?: { readonly directory?: string };
  readonly watch?: { readonly debounce?: number };
  readonly sources?: readonly SourceConfig[];
};

/** All settings that may override values loaded from config files. */
export interface ConfigOptions {
  readonly root: string;
  readonly sourceId?: string;
  readonly includeSources?: boolean;
  /** Use the project root as source "root" when no sources are declared. */
  readonly defaultSource?: boolean;
  readonly index?: string;
  readonly documentsDirectory?: string;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly doctypesDirectory?: string;
  readonly debounce?: number;
}

/** Fully resolved source including its repository-local settings. */
export type ResolvedSource = {
  readonly id: string;
  readonly root: string;
  readonly remote?: { readonly url: string; readonly branch?: string };
  readonly documents: Required<DocumentsConfig>;
  readonly doctypes: Required<DocTypeConfig>;
  readonly validator: ResolvedValidatorConfig;
};

/** Source declaration with its resolved checkout path, before repo config. */
export type ResolvedProjectSource = Pick<
  ResolvedSource,
  "id" | "root" | "remote"
>;

/** Project-level values that can be resolved without opening source repos. */
export interface ResolvedProjectConfig {
  readonly root: string;
  readonly repository: ResolvedConfig["repository"];
  readonly sources: readonly ResolvedProjectSource[];
  readonly knowledge: ResolvedConfig["knowledge"];
  readonly watch: ResolvedConfig["watch"];
}

/** Resolved values for one command invocation; root settings stay separate. */
/** Fully resolved project and all selected, available source repositories. */
export interface ResolvedConfig {
  readonly root: string;
  readonly repository: {
    readonly documents: Required<DocumentsConfig>;
    readonly doctypes: Required<DocTypeConfig>;
    readonly validator: ResolvedValidatorConfig;
  };
  readonly sources: readonly ResolvedSource[];
  readonly knowledge: { readonly index: string };
  readonly watch: { readonly debounce: number };
}

/** Internal parsed file with its location, never returned by the public API. */
export type LoadedConfig = {
  readonly filename: string;
  readonly projectRoot: string;
  readonly config: DokkuratorConfig & {
    readonly sources: readonly SourceConfig[];
  };
};

/** Repository-local subset of the Dokkurator configuration. */
export type RepositoryConfig = Pick<
  DokkuratorConfig,
  "documents" | "doctypes" | "validator"
>;

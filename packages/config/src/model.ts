type DocumentsConfig = {
  readonly directory?: string;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
};

type DocTypeConfig = {
  readonly directory?: string;
};

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
  readonly index?: string;
  readonly documentsDirectory?: string;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly doctypesDirectory?: string;
  readonly debounce?: number;
}

export type ResolvedSource = {
  readonly id: string;
  readonly root: string;
  readonly remote?: { readonly url: string; readonly branch?: string };
  readonly documents: Required<DocumentsConfig>;
  readonly doctypes: Required<DocTypeConfig>;
};

/** Resolved values for one command invocation; root settings stay separate. */
export interface ResolvedConfig {
  readonly root: string;
  readonly repository: {
    readonly documents: Required<DocumentsConfig>;
    readonly doctypes: Required<DocTypeConfig>;
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

export type RepositoryConfig = Pick<DokkuratorConfig, "documents" | "doctypes">;

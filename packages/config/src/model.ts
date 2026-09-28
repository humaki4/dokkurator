//TODO: hier sind nun viele Types, die gar nicht mehr alle aktiv verwendet werden.
//Überarbeiten und ggf. Synchroniereen!!

//---- TODO: alte Config. erkläre bitte. gefällt mir besser als das neue
// ich verstehe nur nicht, was loadedConfig sein soll...
// DokkuratorConfig -> RepositoryConfig (statt sourceConfig) -> DocTypeConfig & DocumentsConfig (statt ContentConfig) fände ich aber sprechender

export interface ContentConfig {
  readonly documents?: {
    readonly directory?: string;
    readonly include?: readonly string[];
    readonly exclude?: readonly string[];
  };
  readonly doctypes?: { readonly directory?: string };
}
export interface SourceConfig {
  readonly id: string;
  readonly path?: string;
  readonly remote?: { readonly url: string; readonly branch?: string };
  readonly config?: ContentConfig;
}
export interface DokkuratorConfig extends ContentConfig {
  readonly version?: 1;
  readonly knowledge?: { readonly index?: string };
  readonly checkouts?: { readonly directory?: string };
  readonly watch?: { readonly debounce?: number };
  readonly sources: readonly SourceConfig[];

  //readonly documents: readonly DocumentsConfig[];
}
export interface LoadedConfig {
  readonly filename: string;
  readonly projectRoot: string;
  readonly config: DokkuratorConfig;
}

//---- Active configuration types ----
export interface EffectiveContentConfig {
  readonly documents: {
    readonly directory: string;
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
  readonly doctypes: { readonly directory: string };
}

export interface ResolvedSourceConfig {
  readonly id: string;
  readonly root: string;
  readonly remote?: { readonly url: string; readonly branch?: string };
}

export interface ActiveSourceConfig extends ResolvedSourceConfig {
  readonly documents: EffectiveContentConfig["documents"];
  readonly doctypes: EffectiveContentConfig["doctypes"];
}

export interface ActiveConfig {
  readonly loaded: LoadedConfig;
  readonly sources: readonly ActiveSourceConfig[];
  readonly knowledge: { readonly index: string };
  readonly watch: { readonly debounce: number };
}

export interface ActiveConfigOptions {
  readonly includeSources?: boolean;
  readonly sourceId?: string;
  readonly index?: string;
  readonly documentsDirectory?: string;
  readonly doctypesDirectory?: string;
  readonly debounce?: number;
}

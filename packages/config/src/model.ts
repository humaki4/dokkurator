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
}
export interface LoadedConfig {
  readonly filename: string;
  readonly projectRoot: string;
  readonly config: DokkuratorConfig;
}
export interface EffectiveContentConfig {
  readonly documents: {
    readonly directory: string;
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
  readonly doctypes: { readonly directory: string };
}

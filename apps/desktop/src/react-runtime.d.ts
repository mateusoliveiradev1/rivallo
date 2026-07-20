declare module '*.css';

interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  glob<T = unknown>(
    pattern: string,
    options?: {
      readonly eager?: boolean;
      readonly import?: string;
      readonly query?: string | Record<string, string | number | boolean>;
    },
  ): Record<string, T>;
}

declare module 'react' {
  export type SetStateAction<State> = State | ((previous: State) => State);
  export type Dispatch<Action> = (value: Action) => void;

  export function StrictMode(props: { children?: unknown }): JSX.Element;
  export function useEffect(
    effect: () => void | (() => void),
    dependencies?: readonly unknown[],
  ): void;
  export function useState<State>(
    initialState: State | (() => State),
  ): [State, Dispatch<SetStateAction<State>>];
}

declare module 'react-dom/client' {
  interface Root {
    render(node: unknown): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export const Fragment: unknown;
}

declare module '*.css';

interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  type Element = unknown;

  interface IntrinsicAttributes {
    key?: string | number;
  }

  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}

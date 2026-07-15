import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Columns3,
  Copy,
  Ellipsis,
  Info,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';

const APPROVED_SIZES = new Set([16, 20, 24]);

const genericIconComponents = {
  add: Plus,
  check: Check,
  close: X,
  'collapse-navigation': PanelLeftClose,
  columns: Columns3,
  copy: Copy,
  danger: CircleAlert,
  'expand-navigation': PanelLeftOpen,
  information: Info,
  loading: LoaderCircle,
  'more-actions': Ellipsis,
  next: ChevronRight,
  previous: ChevronLeft,
  retry: RotateCcw,
  search: Search,
  'sort-ascending': ArrowUp,
  'sort-descending': ArrowDown,
  success: CircleCheck,
  warning: TriangleAlert,
} satisfies Record<string, LucideIcon>;

export const genericIconMetadata = {
  add: { meaning: 'Adicionar item' },
  check: { meaning: 'Confirmar escolha' },
  close: { meaning: 'Fechar contexto' },
  'collapse-navigation': { meaning: 'Recolher navegação' },
  columns: { meaning: 'Configurar colunas' },
  copy: { meaning: 'Copiar conteúdo' },
  danger: { meaning: 'Estado crítico ou erro' },
  'expand-navigation': { meaning: 'Expandir navegação' },
  information: { meaning: 'Informação contextual' },
  loading: { meaning: 'Aguardar operação real' },
  'more-actions': { meaning: 'Abrir ações adicionais' },
  next: { meaning: 'Avançar' },
  previous: { meaning: 'Voltar' },
  retry: { meaning: 'Tentar novamente' },
  search: { meaning: 'Pesquisar' },
  'sort-ascending': { meaning: 'Ordem crescente' },
  'sort-descending': { meaning: 'Ordem decrescente' },
  success: { meaning: 'Estado confirmado ou positivo' },
  warning: { meaning: 'Atenção necessária' },
} as const satisfies Record<keyof typeof genericIconComponents, { readonly meaning: string }>;

export type GenericIconName = keyof typeof genericIconComponents;
export type IconSize = 16 | 20 | 24;

interface IconBaseProps {
  readonly name: GenericIconName;
  readonly size?: IconSize;
  readonly className?: string;
}

interface DecorativeIconProps {
  readonly decorative?: true;
  readonly label?: never;
}

interface SemanticIconProps {
  readonly decorative: false;
  readonly label: string;
}

export type IconProps = IconBaseProps & (DecorativeIconProps | SemanticIconProps);

export function Icon({ name, size = 20, className, decorative = true, label }: IconProps) {
  const Component = genericIconComponents[name];
  if (!Component) {
    throw new Error(`Unsupported Rivallo icon name: ${String(name)}.`);
  }
  if (!APPROVED_SIZES.has(size)) {
    throw new Error(`Unsupported Rivallo icon size: ${String(size)}. Use 16, 20, or 24.`);
  }
  if (!decorative && (!label || label.trim().length === 0)) {
    throw new Error('Semantic Rivallo icons require a non-empty label.');
  }

  return (
    <Component
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={className}
      color="currentColor"
      fill="none"
      focusable="false"
      role={decorative ? undefined : 'img'}
      size={size}
      strokeWidth={1.75}
    />
  );
}

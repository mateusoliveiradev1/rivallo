import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
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
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  Settings,
  TriangleAlert,
  Users,
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
  people: Users,
  previous: ChevronLeft,
  retry: RotateCcw,
  schedule: CalendarDays,
  search: Search,
  settings: Settings,
  'sort-ascending': ArrowUp,
  'sort-descending': ArrowDown,
  success: CircleCheck,
  warning: TriangleAlert,
  workspace: LayoutDashboard,
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
  people: { meaning: 'Pessoas e equipes' },
  previous: { meaning: 'Voltar' },
  retry: { meaning: 'Tentar novamente' },
  schedule: { meaning: 'Agenda e calendário' },
  search: { meaning: 'Pesquisar' },
  settings: { meaning: 'Configurações' },
  'sort-ascending': { meaning: 'Ordem crescente' },
  'sort-descending': { meaning: 'Ordem decrescente' },
  success: { meaning: 'Estado confirmado ou positivo' },
  warning: { meaning: 'Atenção necessária' },
  workspace: { meaning: 'Área de trabalho' },
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

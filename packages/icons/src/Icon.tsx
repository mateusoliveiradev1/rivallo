import {
  Activity,
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  Binoculars,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CloudSun,
  Columns3,
  Copy,
  Ellipsis,
  FileChartColumn,
  Gauge,
  Heart,
  House,
  Info,
  Landmark,
  ListChecks,
  ListFilter,
  LoaderCircle,
  LayoutDashboard,
  Mail,
  Maximize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  TriangleAlert,
  Trophy,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

const APPROVED_SIZES = new Set([16, 20, 24]);

const genericIconComponents = {
  add: Plus,
  analysis: ChartNoAxesColumnIncreasing,
  check: Check,
  close: X,
  club: Shield,
  'collapse-navigation': PanelLeftClose,
  columns: Columns3,
  competitions: Trophy,
  condition: Gauge,
  copy: Copy,
  danger: CircleAlert,
  'data-hub': ChartNoAxesCombined,
  dynamics: Activity,
  edit: Pencil,
  'expand-navigation': PanelLeftOpen,
  favorite: Star,
  filter: ListFilter,
  finances: Landmark,
  fullscreen: Maximize2,
  fitness: Heart,
  home: House,
  inbox: Mail,
  information: Info,
  instructions: ListChecks,
  loading: LoaderCircle,
  minimize: Minus,
  'more-actions': Ellipsis,
  next: ChevronRight,
  opposition: ShieldAlert,
  people: Users,
  previous: ChevronLeft,
  reports: FileChartColumn,
  retry: RotateCcw,
  save: Save,
  schedule: CalendarDays,
  scouting: Binoculars,
  search: Search,
  settings: Settings,
  staff: UserRoundCog,
  'sort-ascending': ArrowUp,
  'sort-descending': ArrowDown,
  success: CircleCheck,
  tactics: SlidersHorizontal,
  transfers: ArrowLeftRight,
  warning: TriangleAlert,
  weather: CloudSun,
  workspace: LayoutDashboard,
} satisfies Record<string, LucideIcon>;

export const genericIconMetadata = {
  add: { meaning: 'Adicionar item' },
  analysis: { meaning: 'Análise de desempenho' },
  check: { meaning: 'Confirmar escolha' },
  close: { meaning: 'Fechar contexto' },
  club: { meaning: 'Área do clube' },
  'collapse-navigation': { meaning: 'Recolher navegação' },
  columns: { meaning: 'Configurar colunas' },
  competitions: { meaning: 'Competições e troféus' },
  condition: { meaning: 'Condição física' },
  copy: { meaning: 'Copiar conteúdo' },
  danger: { meaning: 'Estado crítico ou erro' },
  'data-hub': { meaning: 'Central de dados' },
  dynamics: { meaning: 'Dinâmica do grupo' },
  edit: { meaning: 'Editar configuração' },
  'expand-navigation': { meaning: 'Expandir navegação' },
  favorite: { meaning: 'Destaque ou favorito' },
  filter: { meaning: 'Filtrar conteúdo' },
  finances: { meaning: 'Finanças do clube' },
  fullscreen: { meaning: 'Alternar tela cheia' },
  fitness: { meaning: 'Estado de saúde' },
  home: { meaning: 'Página inicial' },
  inbox: { meaning: 'Caixa de entrada' },
  information: { meaning: 'Informação contextual' },
  instructions: { meaning: 'Instruções da equipe' },
  loading: { meaning: 'Aguardar operação real' },
  minimize: { meaning: 'Minimizar janela' },
  'more-actions': { meaning: 'Abrir ações adicionais' },
  next: { meaning: 'Avançar' },
  opposition: { meaning: 'Análise da oposição' },
  people: { meaning: 'Pessoas e equipes' },
  previous: { meaning: 'Voltar' },
  reports: { meaning: 'Relatórios do clube' },
  retry: { meaning: 'Tentar novamente' },
  save: { meaning: 'Salvar alterações' },
  schedule: { meaning: 'Agenda e calendário' },
  scouting: { meaning: 'Observação de jogadores' },
  search: { meaning: 'Pesquisar' },
  settings: { meaning: 'Configurações' },
  staff: { meaning: 'Equipe técnica' },
  'sort-ascending': { meaning: 'Ordem crescente' },
  'sort-descending': { meaning: 'Ordem decrescente' },
  success: { meaning: 'Estado confirmado ou positivo' },
  tactics: { meaning: 'Táticas da equipe' },
  transfers: { meaning: 'Transferências de jogadores' },
  warning: { meaning: 'Atenção necessária' },
  weather: { meaning: 'Condições do tempo' },
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

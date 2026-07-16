export type TableViewProvenance = 'system-default' | 'user-owned' | 'shared-read-only';
export type TableViewPinSide = 'none' | 'start' | 'end';
export type TableViewSortDirection = 'asc' | 'desc';
export type TableViewNullOrder = 'first' | 'last';
export type TableViewFilterLogic = 'and' | 'or';
export type TableViewFilterValueKind =
  'text' | 'number' | 'boolean' | 'enum' | 'enum-set' | 'number-range';

export interface TableViewPinning {
  readonly side: TableViewPinSide;
  readonly order: number | null;
}

export interface TableViewColumnState {
  readonly columnId: string;
  readonly visible: boolean;
  readonly width: number;
  readonly pinning: TableViewPinning;
}

export interface TableViewSortClause {
  readonly columnId: string;
  readonly direction: TableViewSortDirection;
  readonly nulls: TableViewNullOrder;
}

export type TableViewFilterValue =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'enum'; readonly value: string }
  | { readonly kind: 'enum-set'; readonly value: readonly string[] }
  | { readonly kind: 'number-range'; readonly min: number; readonly max: number };

export interface TableViewFilterClause {
  readonly kind: 'clause';
  readonly filterId: string;
  readonly columnId: string;
  readonly operator: string;
  readonly value: TableViewFilterValue;
  readonly enabled: boolean;
}

export interface TableViewFilterGroup {
  readonly kind: 'group';
  readonly groupId: string;
  readonly logic: TableViewFilterLogic;
  readonly children: readonly TableViewFilterNode[];
}

export type TableViewFilterNode = TableViewFilterClause | TableViewFilterGroup;

export interface TableViewGroupingClause {
  readonly groupId: string;
  readonly columnId: string;
  readonly mode: string;
}

export interface TableViewDataWindow {
  readonly windowId: string;
  readonly mode: 'client-pagination';
  readonly page: number;
  readonly pageSize: number;
}

export interface TableViewState {
  readonly tableId: string;
  readonly schemaVersion: number;
  readonly ownerScope: string;
  readonly viewId: string;
  readonly baselineViewId: string;
  readonly provenance: TableViewProvenance;
  readonly label: string;
  readonly density: string;
  readonly columns: readonly TableViewColumnState[];
  readonly sort: readonly TableViewSortClause[];
  readonly filter: TableViewFilterGroup;
  readonly grouping: readonly TableViewGroupingClause[];
  readonly dataWindow: TableViewDataWindow;
}

export interface TableViewFilterOperatorSchema {
  readonly operator: string;
  readonly valueKind: TableViewFilterValueKind;
  readonly allowedValues?: readonly (string | number | boolean)[];
}

export interface TableViewColumnCapabilities {
  readonly hideable: boolean;
  readonly reorderable: boolean;
  readonly resizable: boolean;
  readonly pinnable: boolean;
  readonly sortable: boolean;
  readonly filterOperators: readonly TableViewFilterOperatorSchema[];
  readonly groupingModes: readonly string[];
}

export interface TableViewColumnSchema {
  readonly columnId: string;
  readonly label: string;
  readonly required: boolean;
  readonly requiredReason: string | null;
  readonly defaultVisible: boolean;
  readonly width: {
    readonly default: number;
    readonly min: number;
    readonly max: number;
  };
  readonly defaultPinning: TableViewPinning;
  readonly pinningLocked?: boolean;
  readonly capabilities: TableViewColumnCapabilities;
}

export interface TableViewDensitySchema {
  readonly densityId: string;
  readonly label: string;
  readonly rowHeight: number;
}

export interface TableViewConstraints {
  readonly maxColumns: number;
  readonly maxPinnedColumns: number;
  readonly maxPinnedWidthRatio: number;
  readonly maxSortClauses: number;
  readonly maxFilterDepth: number;
  readonly maxFilterClauses: number;
  readonly maxGroupingClauses: number;
}

export interface TableViewSchema {
  readonly tableId: string;
  readonly schemaVersion: number;
  readonly ownerScope: string;
  readonly columns: readonly TableViewColumnSchema[];
  readonly densities: readonly TableViewDensitySchema[];
  readonly constraints: TableViewConstraints;
  readonly groupingSupported: boolean;
  readonly dataWindow: {
    readonly mode: 'client-pagination';
    readonly pageSizeOptions: readonly number[];
    readonly defaultPageSize: number;
    readonly maxPage: number;
  };
}

export type TableViewRejectionCode =
  | 'invalid-identity'
  | 'invalid-schema-version'
  | 'invalid-schema-constraint'
  | 'column-limit-exceeded'
  | 'duplicate-column-id'
  | 'invalid-column-width'
  | 'invalid-required-column'
  | 'invalid-column-capability'
  | 'duplicate-filter-operator'
  | 'invalid-filter-operator'
  | 'invalid-density'
  | 'duplicate-density-id'
  | 'invalid-default-pinning'
  | 'invalid-data-window-schema'
  | 'table-id-mismatch'
  | 'schema-version-mismatch'
  | 'owner-scope-mismatch'
  | 'invalid-view-label'
  | 'invalid-provenance'
  | 'unknown-column-id'
  | 'missing-column-id'
  | 'required-column-hidden'
  | 'column-visibility-unsupported'
  | 'column-width-out-of-bounds'
  | 'column-resize-unsupported'
  | 'column-reorder-unsupported'
  | 'column-pinning-unsupported'
  | 'invalid-pin-order'
  | 'pinned-column-limit-exceeded'
  | 'pinned-width-limit-exceeded'
  | 'unsupported-density'
  | 'sort-limit-exceeded'
  | 'duplicate-sort-column'
  | 'sort-unsupported'
  | 'invalid-sort-clause'
  | 'invalid-filter-group'
  | 'duplicate-filter-id'
  | 'duplicate-filter-group-id'
  | 'filter-depth-exceeded'
  | 'filter-clause-limit-exceeded'
  | 'unsupported-filter-operator'
  | 'incompatible-filter-value'
  | 'grouping-unsupported'
  | 'grouping-limit-exceeded'
  | 'duplicate-grouping-id'
  | 'duplicate-grouping-column'
  | 'unsupported-grouping-mode'
  | 'invalid-data-window'
  | 'invalid-column-index'
  | 'baseline-view-id-mismatch'
  | 'unsupported-command';

export interface TableViewRejectionReason {
  readonly code: TableViewRejectionCode;
  readonly path: string;
  readonly detail?: string;
}

export type TableViewValidationResult =
  { readonly valid: true } | { readonly valid: false; readonly reason: TableViewRejectionReason };

export type TableViewCommand =
  | {
      readonly type: 'column.visibility';
      readonly columnId: string;
      readonly visible: boolean;
    }
  | {
      readonly type: 'column.reorder';
      readonly columnId: string;
      readonly toIndex: number;
    }
  | {
      readonly type: 'column.resize';
      readonly columnId: string;
      readonly width: number;
    }
  | {
      readonly type: 'column.pin';
      readonly columnId: string;
      readonly side: TableViewPinSide;
      readonly order?: number;
    }
  | { readonly type: 'density.set'; readonly density: string }
  | { readonly type: 'sort.set'; readonly sort: readonly TableViewSortClause[] }
  | { readonly type: 'filter.set'; readonly filter: TableViewFilterGroup }
  | {
      readonly type: 'grouping.set';
      readonly grouping: readonly TableViewGroupingClause[];
    }
  | {
      readonly type: 'view.propose';
      readonly viewId: string;
      readonly baselineViewId: string;
      readonly provenance: TableViewProvenance;
      readonly label: string;
    }
  | { readonly type: 'view.reset'; readonly baseline: TableViewState }
  | { readonly type: 'data-window.set'; readonly dataWindow: TableViewDataWindow };

export type TableViewFocusTarget =
  | { readonly kind: 'column'; readonly columnId: string }
  | { readonly kind: 'view'; readonly viewId: string }
  | { readonly kind: 'table'; readonly tableId: string };

export interface TableViewAnnouncement {
  readonly messageId: TableViewCommand['type'] | 'command.rejected';
  readonly values: Readonly<Record<string, string | number | boolean>>;
}

export type TableViewEvent =
  | {
      readonly type: 'accepted';
      readonly commandType: TableViewCommand['type'];
      readonly focus: TableViewFocusTarget;
      readonly announcement: TableViewAnnouncement;
    }
  | {
      readonly type: 'rejected';
      readonly commandType: TableViewCommand['type'];
      readonly reason: TableViewRejectionReason;
      readonly focus: TableViewFocusTarget | null;
      readonly announcement: TableViewAnnouncement;
    };

export type TableViewCommandResult =
  | {
      readonly accepted: true;
      readonly state: TableViewState;
      readonly event: Extract<TableViewEvent, { readonly type: 'accepted' }>;
    }
  | {
      readonly accepted: false;
      readonly state: TableViewState;
      readonly event: Extract<TableViewEvent, { readonly type: 'rejected' }>;
    };

const IDENTITY_PATTERN = /^(?=.*[A-Za-z])[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const MAX_VIEW_LABEL_LENGTH = 80;
const MAX_TEXT_FILTER_LENGTH = 200;
const PIN_RATIO_EPSILON = 1e-9;

const rejection = (
  code: TableViewRejectionCode,
  path: string,
  detail?: string,
): TableViewRejectionReason => (detail === undefined ? { code, path } : { code, path, detail });

const invalid = (
  code: TableViewRejectionCode,
  path: string,
  detail?: string,
): TableViewValidationResult => ({
  valid: false,
  reason: rejection(code, path, detail),
});

const isStableIdentity = (value: unknown): value is string =>
  typeof value === 'string' && IDENTITY_PATTERN.test(value);

const isFinitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const findDuplicate = (values: readonly string[]) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
};

const validatePinningShape = (
  pinning: TableViewPinning,
  path: string,
): TableViewValidationResult => {
  if (!['none', 'start', 'end'].includes(pinning.side)) {
    return invalid('invalid-pin-order', `${path}.side`);
  }
  if (pinning.side === 'none') {
    return pinning.order === null ? { valid: true } : invalid('invalid-pin-order', `${path}.order`);
  }
  return isNonNegativeInteger(pinning.order)
    ? { valid: true }
    : invalid('invalid-pin-order', `${path}.order`);
};

const validatePinCollection = (
  schema: TableViewSchema,
  columns: readonly TableViewColumnState[],
): TableViewValidationResult => {
  const pinned = columns.filter(({ pinning }) => pinning.side !== 'none');
  if (pinned.length > schema.constraints.maxPinnedColumns) {
    return invalid(
      'pinned-column-limit-exceeded',
      'columns',
      `${pinned.length}/${schema.constraints.maxPinnedColumns}`,
    );
  }

  for (const side of ['start', 'end'] as const) {
    const sideColumns = pinned
      .filter(({ pinning }) => pinning.side === side)
      .sort((left, right) => (left.pinning.order ?? 0) - (right.pinning.order ?? 0));
    for (const [expectedOrder, column] of sideColumns.entries()) {
      if (column.pinning.order !== expectedOrder) {
        return invalid('invalid-pin-order', `columns.${column.columnId}.pinning.order`);
      }
    }
  }

  const schemaWidthBasis = schema.columns
    .filter(({ defaultVisible }) => defaultVisible)
    .reduce((total, column) => total + column.width.default, 0);
  const pinnedWidth = columns
    .filter(({ pinning }) => pinning.side !== 'none')
    .reduce((total, column) => total + column.width, 0);
  if (
    schemaWidthBasis > 0 &&
    pinnedWidth / schemaWidthBasis > schema.constraints.maxPinnedWidthRatio + PIN_RATIO_EPSILON
  ) {
    return invalid('pinned-width-limit-exceeded', 'columns', `${pinnedWidth}/${schemaWidthBasis}`);
  }

  return { valid: true };
};

const validateFilterValue = (
  value: TableViewFilterValue,
  operator: TableViewFilterOperatorSchema,
  path: string,
): TableViewValidationResult => {
  if (value.kind !== operator.valueKind) {
    return invalid('incompatible-filter-value', path);
  }

  switch (value.kind) {
    case 'text':
      return typeof value.value === 'string' && value.value.length <= MAX_TEXT_FILTER_LENGTH
        ? { valid: true }
        : invalid('incompatible-filter-value', path);
    case 'number':
      return Number.isFinite(value.value)
        ? { valid: true }
        : invalid('incompatible-filter-value', path);
    case 'boolean':
      return typeof value.value === 'boolean'
        ? { valid: true }
        : invalid('incompatible-filter-value', path);
    case 'enum': {
      const allowedValues = operator.allowedValues ?? [];
      return typeof value.value === 'string' && allowedValues.includes(value.value)
        ? { valid: true }
        : invalid('incompatible-filter-value', path);
    }
    case 'enum-set': {
      const allowedValues = operator.allowedValues ?? [];
      return Array.isArray(value.value) &&
        value.value.every((entry) => typeof entry === 'string' && allowedValues.includes(entry))
        ? { valid: true }
        : invalid('incompatible-filter-value', path);
    }
    case 'number-range':
      return Number.isFinite(value.min) && Number.isFinite(value.max) && value.min <= value.max
        ? { valid: true }
        : invalid('incompatible-filter-value', path);
  }
};

const validateFilterTree = (
  schema: TableViewSchema,
  root: TableViewFilterGroup,
): TableViewValidationResult => {
  const filterIds = new Set<string>();
  const groupIds = new Set<string>();
  let clauseCount = 0;

  const visit = (
    node: TableViewFilterNode,
    depth: number,
    path: string,
  ): TableViewValidationResult => {
    if (node.kind === 'group') {
      if (depth > schema.constraints.maxFilterDepth) {
        return invalid('filter-depth-exceeded', path);
      }
      if (!isStableIdentity(node.groupId) || !['and', 'or'].includes(node.logic)) {
        return invalid('invalid-filter-group', path);
      }
      if (groupIds.has(node.groupId)) {
        return invalid('duplicate-filter-group-id', `${path}.groupId`);
      }
      groupIds.add(node.groupId);
      if (!Array.isArray(node.children)) {
        return invalid('invalid-filter-group', `${path}.children`);
      }
      for (const [index, child] of node.children.entries()) {
        const result = visit(child, depth + 1, `${path}.children.${index}`);
        if (!result.valid) return result;
      }
      return { valid: true };
    }

    clauseCount += 1;
    if (clauseCount > schema.constraints.maxFilterClauses) {
      return invalid('filter-clause-limit-exceeded', path);
    }
    if (!isStableIdentity(node.filterId)) {
      return invalid('invalid-identity', `${path}.filterId`);
    }
    if (filterIds.has(node.filterId)) {
      return invalid('duplicate-filter-id', `${path}.filterId`);
    }
    filterIds.add(node.filterId);
    const column = schema.columns.find(({ columnId }) => columnId === node.columnId);
    if (column === undefined) {
      return invalid('unknown-column-id', `${path}.columnId`);
    }
    const operator = column.capabilities.filterOperators.find(
      ({ operator: supportedOperator }) => supportedOperator === node.operator,
    );
    if (operator === undefined) {
      return invalid('unsupported-filter-operator', `${path}.operator`);
    }
    if (typeof node.enabled !== 'boolean') {
      return invalid('incompatible-filter-value', `${path}.enabled`);
    }
    return validateFilterValue(node.value, operator, `${path}.value`);
  };

  return visit(root, 1, 'filter');
};

export const validateTableViewSchema = (schema: TableViewSchema): TableViewValidationResult => {
  if (!isStableIdentity(schema.tableId)) return invalid('invalid-identity', 'tableId');
  if (!isStableIdentity(schema.ownerScope)) return invalid('invalid-identity', 'ownerScope');
  if (!Number.isInteger(schema.schemaVersion) || schema.schemaVersion <= 0) {
    return invalid('invalid-schema-version', 'schemaVersion');
  }

  const { constraints } = schema;
  if (
    !Number.isInteger(constraints.maxColumns) ||
    constraints.maxColumns <= 0 ||
    !isNonNegativeInteger(constraints.maxPinnedColumns) ||
    constraints.maxPinnedColumns > constraints.maxColumns ||
    !Number.isFinite(constraints.maxPinnedWidthRatio) ||
    constraints.maxPinnedWidthRatio <= 0 ||
    constraints.maxPinnedWidthRatio > 1 ||
    !isNonNegativeInteger(constraints.maxSortClauses) ||
    !Number.isInteger(constraints.maxFilterDepth) ||
    constraints.maxFilterDepth <= 0 ||
    !isNonNegativeInteger(constraints.maxFilterClauses) ||
    !isNonNegativeInteger(constraints.maxGroupingClauses)
  ) {
    return invalid('invalid-schema-constraint', 'constraints');
  }
  if (!schema.groupingSupported && constraints.maxGroupingClauses !== 0) {
    return invalid('invalid-schema-constraint', 'constraints.maxGroupingClauses');
  }

  if (!Array.isArray(schema.columns) || schema.columns.length === 0) {
    return invalid('invalid-schema-constraint', 'columns');
  }
  if (schema.columns.length > constraints.maxColumns) {
    return invalid('column-limit-exceeded', 'columns');
  }
  const duplicateColumnId = findDuplicate(schema.columns.map(({ columnId }) => columnId));
  if (duplicateColumnId !== null) {
    return invalid('duplicate-column-id', 'columns', duplicateColumnId);
  }

  for (const [index, column] of schema.columns.entries()) {
    const path = `columns.${index}`;
    if (!isStableIdentity(column.columnId)) return invalid('invalid-identity', `${path}.columnId`);
    if (typeof column.label !== 'string' || column.label.length === 0) {
      return invalid('invalid-column-capability', `${path}.label`);
    }
    if (
      column.required &&
      (column.requiredReason === null || column.requiredReason.trim().length === 0)
    ) {
      return invalid('invalid-required-column', `${path}.requiredReason`);
    }
    if (column.required && (!column.defaultVisible || column.capabilities.hideable)) {
      return invalid('invalid-required-column', path);
    }
    const { min, default: defaultWidth, max } = column.width;
    if (
      !isFinitePositive(min) ||
      !isFinitePositive(defaultWidth) ||
      !isFinitePositive(max) ||
      min > defaultWidth ||
      defaultWidth > max
    ) {
      return invalid('invalid-column-width', `${path}.width`);
    }
    const pinningResult = validatePinningShape(column.defaultPinning, `${path}.defaultPinning`);
    if (!pinningResult.valid) return invalid('invalid-default-pinning', path);
    if (
      column.defaultPinning.side !== 'none' &&
      !column.capabilities.pinnable &&
      !column.pinningLocked
    ) {
      return invalid('invalid-column-capability', `${path}.capabilities.pinnable`);
    }
    if (
      column.pinningLocked &&
      (column.defaultPinning.side === 'none' || column.capabilities.pinnable)
    ) {
      return invalid('invalid-column-capability', `${path}.pinningLocked`);
    }
    if (!Array.isArray(column.capabilities.filterOperators)) {
      return invalid('invalid-column-capability', `${path}.capabilities.filterOperators`);
    }
    const duplicateOperator = findDuplicate(
      column.capabilities.filterOperators.map(
        (operator: TableViewFilterOperatorSchema) => operator.operator,
      ),
    );
    if (duplicateOperator !== null) {
      return invalid('duplicate-filter-operator', `${path}.capabilities.filterOperators`);
    }
    for (const [operatorIndex, operator] of column.capabilities.filterOperators.entries()) {
      const operatorPath = `${path}.capabilities.filterOperators.${operatorIndex}`;
      if (!isStableIdentity(operator.operator)) {
        return invalid('invalid-filter-operator', `${operatorPath}.operator`);
      }
      if (
        ['enum', 'enum-set'].includes(operator.valueKind) &&
        (operator.allowedValues === undefined || operator.allowedValues.length === 0)
      ) {
        return invalid('invalid-filter-operator', `${operatorPath}.allowedValues`);
      }
    }
    if (!Array.isArray(column.capabilities.groupingModes)) {
      return invalid('invalid-column-capability', `${path}.capabilities.groupingModes`);
    }
    if (!schema.groupingSupported && column.capabilities.groupingModes.length > 0) {
      return invalid('invalid-column-capability', `${path}.capabilities.groupingModes`);
    }
  }

  if (!Array.isArray(schema.densities) || schema.densities.length === 0) {
    return invalid('invalid-density', 'densities');
  }
  const duplicateDensity = findDuplicate(schema.densities.map(({ densityId }) => densityId));
  if (duplicateDensity !== null) {
    return invalid('duplicate-density-id', 'densities', duplicateDensity);
  }
  for (const [index, density] of schema.densities.entries()) {
    if (
      !isStableIdentity(density.densityId) ||
      typeof density.label !== 'string' ||
      density.label.length === 0 ||
      !isFinitePositive(density.rowHeight)
    ) {
      return invalid('invalid-density', `densities.${index}`);
    }
  }

  if (
    schema.dataWindow.mode !== 'client-pagination' ||
    !Array.isArray(schema.dataWindow.pageSizeOptions) ||
    schema.dataWindow.pageSizeOptions.length === 0 ||
    schema.dataWindow.pageSizeOptions.some(
      (pageSize) => !Number.isInteger(pageSize) || pageSize <= 0,
    ) ||
    new Set(schema.dataWindow.pageSizeOptions).size !== schema.dataWindow.pageSizeOptions.length ||
    !schema.dataWindow.pageSizeOptions.includes(schema.dataWindow.defaultPageSize) ||
    !Number.isInteger(schema.dataWindow.maxPage) ||
    schema.dataWindow.maxPage <= 0
  ) {
    return invalid('invalid-data-window-schema', 'dataWindow');
  }

  const defaultColumns = schema.columns.map<TableViewColumnState>((column) => ({
    columnId: column.columnId,
    visible: column.defaultVisible,
    width: column.width.default,
    pinning: column.defaultPinning,
  }));
  const defaultPinningResult = validatePinCollection(schema, defaultColumns);
  if (!defaultPinningResult.valid) {
    return invalid('invalid-default-pinning', defaultPinningResult.reason.path);
  }

  return { valid: true };
};

export const validateTableViewState = (
  schema: TableViewSchema,
  state: TableViewState,
): TableViewValidationResult => {
  const schemaResult = validateTableViewSchema(schema);
  if (!schemaResult.valid) return schemaResult;

  if (state.tableId !== schema.tableId) return invalid('table-id-mismatch', 'tableId');
  if (state.schemaVersion !== schema.schemaVersion) {
    return invalid('schema-version-mismatch', 'schemaVersion');
  }
  if (state.ownerScope !== schema.ownerScope) {
    return invalid('owner-scope-mismatch', 'ownerScope');
  }
  if (!isStableIdentity(state.viewId)) return invalid('invalid-identity', 'viewId');
  if (!isStableIdentity(state.baselineViewId)) {
    return invalid('invalid-identity', 'baselineViewId');
  }
  if (
    typeof state.label !== 'string' ||
    state.label.trim().length === 0 ||
    state.label.length > MAX_VIEW_LABEL_LENGTH
  ) {
    return invalid('invalid-view-label', 'label');
  }
  if (!['system-default', 'user-owned', 'shared-read-only'].includes(state.provenance)) {
    return invalid('invalid-provenance', 'provenance');
  }

  if (!Array.isArray(state.columns) || state.columns.length > schema.constraints.maxColumns) {
    return invalid('column-limit-exceeded', 'columns');
  }
  const duplicateColumnId = findDuplicate(state.columns.map(({ columnId }) => columnId));
  if (duplicateColumnId !== null) {
    return invalid('duplicate-column-id', 'columns', duplicateColumnId);
  }
  for (const [index, column] of state.columns.entries()) {
    const columnSchema = schema.columns.find(({ columnId }) => columnId === column.columnId);
    const path = `columns.${index}`;
    if (columnSchema === undefined) return invalid('unknown-column-id', `${path}.columnId`);
    if (typeof column.visible !== 'boolean') {
      return invalid('column-visibility-unsupported', `${path}.visible`);
    }
    if (columnSchema.required && !column.visible) {
      return invalid('required-column-hidden', `${path}.visible`);
    }
    if (!column.visible && !columnSchema.capabilities.hideable) {
      return invalid('column-visibility-unsupported', `${path}.visible`);
    }
    if (!Number.isFinite(column.width)) return invalid('invalid-column-width', `${path}.width`);
    if (column.width < columnSchema.width.min || column.width > columnSchema.width.max) {
      return invalid('column-width-out-of-bounds', `${path}.width`);
    }
    const pinningResult = validatePinningShape(column.pinning, `${path}.pinning`);
    if (!pinningResult.valid) return pinningResult;
    if (
      columnSchema.pinningLocked &&
      (column.pinning.side !== columnSchema.defaultPinning.side ||
        column.pinning.order !== columnSchema.defaultPinning.order)
    ) {
      return invalid('column-pinning-unsupported', `${path}.pinning`);
    }
    if (
      column.pinning.side !== 'none' &&
      !columnSchema.capabilities.pinnable &&
      !columnSchema.pinningLocked
    ) {
      return invalid('column-pinning-unsupported', `${path}.pinning`);
    }
  }
  for (const columnSchema of schema.columns) {
    if (!state.columns.some(({ columnId }) => columnId === columnSchema.columnId)) {
      return invalid('missing-column-id', 'columns', columnSchema.columnId);
    }
  }
  const pinningResult = validatePinCollection(schema, state.columns);
  if (!pinningResult.valid) return pinningResult;

  if (!schema.densities.some(({ densityId }) => densityId === state.density)) {
    return invalid('unsupported-density', 'density');
  }

  if (!Array.isArray(state.sort) || state.sort.length > schema.constraints.maxSortClauses) {
    return invalid('sort-limit-exceeded', 'sort');
  }
  const duplicateSortColumn = findDuplicate(state.sort.map(({ columnId }) => columnId));
  if (duplicateSortColumn !== null) {
    return invalid('duplicate-sort-column', 'sort', duplicateSortColumn);
  }
  for (const [index, sort] of state.sort.entries()) {
    const column = schema.columns.find(({ columnId }) => columnId === sort.columnId);
    if (column === undefined) return invalid('unknown-column-id', `sort.${index}.columnId`);
    if (!column.capabilities.sortable) return invalid('sort-unsupported', `sort.${index}`);
    if (!['asc', 'desc'].includes(sort.direction) || !['first', 'last'].includes(sort.nulls)) {
      return invalid('invalid-sort-clause', `sort.${index}`);
    }
  }

  if (state.filter?.kind !== 'group') return invalid('invalid-filter-group', 'filter');
  const filterResult = validateFilterTree(schema, state.filter);
  if (!filterResult.valid) return filterResult;

  if (!Array.isArray(state.grouping)) return invalid('grouping-unsupported', 'grouping');
  if (!schema.groupingSupported && state.grouping.length > 0) {
    return invalid('grouping-unsupported', 'grouping');
  }
  if (state.grouping.length > schema.constraints.maxGroupingClauses) {
    return invalid('grouping-limit-exceeded', 'grouping');
  }
  const duplicateGroupingId = findDuplicate(state.grouping.map(({ groupId }) => groupId));
  if (duplicateGroupingId !== null) {
    return invalid('duplicate-grouping-id', 'grouping', duplicateGroupingId);
  }
  const duplicateGroupingColumn = findDuplicate(state.grouping.map(({ columnId }) => columnId));
  if (duplicateGroupingColumn !== null) {
    return invalid('duplicate-grouping-column', 'grouping', duplicateGroupingColumn);
  }
  for (const [index, grouping] of state.grouping.entries()) {
    if (!isStableIdentity(grouping.groupId)) {
      return invalid('invalid-identity', `grouping.${index}.groupId`);
    }
    const column = schema.columns.find(({ columnId }) => columnId === grouping.columnId);
    if (column === undefined) {
      return invalid('unknown-column-id', `grouping.${index}.columnId`);
    }
    if (!column.capabilities.groupingModes.includes(grouping.mode)) {
      return invalid('unsupported-grouping-mode', `grouping.${index}.mode`);
    }
  }

  if (
    !isStableIdentity(state.dataWindow.windowId) ||
    state.dataWindow.mode !== schema.dataWindow.mode ||
    !Number.isInteger(state.dataWindow.page) ||
    state.dataWindow.page < 1 ||
    state.dataWindow.page > schema.dataWindow.maxPage ||
    !schema.dataWindow.pageSizeOptions.includes(state.dataWindow.pageSize)
  ) {
    return invalid('invalid-data-window', 'dataWindow');
  }

  return { valid: true };
};

export class TableViewStateValidationError extends Error {
  readonly reason: TableViewRejectionReason;

  constructor(reason: TableViewRejectionReason) {
    super(`Invalid table view state: ${reason.code} at ${reason.path}`);
    this.name = 'TableViewStateValidationError';
    this.reason = reason;
  }
}

const compareCodePoints = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const normalizeFilterValue = (value: TableViewFilterValue): TableViewFilterValue => {
  switch (value.kind) {
    case 'enum-set':
      return {
        kind: 'enum-set',
        value: [...new Set(value.value)].sort(compareCodePoints),
      };
    case 'number':
      return { kind: 'number', value: Object.is(value.value, -0) ? 0 : value.value };
    case 'number-range':
      return {
        kind: 'number-range',
        min: Object.is(value.min, -0) ? 0 : value.min,
        max: Object.is(value.max, -0) ? 0 : value.max,
      };
    case 'text':
      return { kind: 'text', value: value.value };
    case 'boolean':
      return { kind: 'boolean', value: value.value };
    case 'enum':
      return { kind: 'enum', value: value.value };
  }
};

const normalizeFilterNode = (node: TableViewFilterNode): TableViewFilterNode => {
  if (node.kind === 'clause') {
    return {
      kind: 'clause',
      filterId: node.filterId,
      columnId: node.columnId,
      operator: node.operator,
      value: normalizeFilterValue(node.value),
      enabled: node.enabled,
    };
  }

  const children = node.children.map(normalizeFilterNode).sort((left, right) => {
    const leftId = left.kind === 'clause' ? `clause:${left.filterId}` : `group:${left.groupId}`;
    const rightId = right.kind === 'clause' ? `clause:${right.filterId}` : `group:${right.groupId}`;
    return compareCodePoints(leftId, rightId);
  });
  return {
    kind: 'group',
    groupId: node.groupId,
    logic: node.logic,
    children,
  };
};

const normalizeWidth = (schema: TableViewColumnSchema, width: number) => {
  const clamped = Math.min(schema.width.max, Math.max(schema.width.min, width));
  return Number(clamped.toFixed(3));
};

export const normalizeTableViewState = (
  schema: TableViewSchema,
  state: TableViewState,
): TableViewState => {
  const validation = validateTableViewState(schema, state);
  if (!validation.valid) throw new TableViewStateValidationError(validation.reason);

  return {
    tableId: state.tableId,
    schemaVersion: state.schemaVersion,
    ownerScope: state.ownerScope,
    viewId: state.viewId,
    baselineViewId: state.baselineViewId,
    provenance: state.provenance,
    label: state.label,
    density: state.density,
    columns: state.columns.map((column) => {
      const columnSchema = schema.columns.find(({ columnId }) => columnId === column.columnId)!;
      return {
        columnId: column.columnId,
        visible: column.visible,
        width: normalizeWidth(columnSchema, column.width),
        pinning:
          column.pinning.side === 'none'
            ? { side: 'none', order: null }
            : { side: column.pinning.side, order: column.pinning.order },
      };
    }),
    sort: state.sort.map((sort) => ({
      columnId: sort.columnId,
      direction: sort.direction,
      nulls: sort.nulls,
    })),
    filter: normalizeFilterNode(state.filter) as TableViewFilterGroup,
    grouping: state.grouping.map((grouping) => ({
      groupId: grouping.groupId,
      columnId: grouping.columnId,
      mode: grouping.mode,
    })),
    dataWindow: {
      windowId: state.dataWindow.windowId,
      mode: state.dataWindow.mode,
      page: state.dataWindow.page,
      pageSize: state.dataWindow.pageSize,
    },
  };
};

const dirtyProjection = (state: TableViewState) => ({
  tableId: state.tableId,
  schemaVersion: state.schemaVersion,
  ownerScope: state.ownerScope,
  density: state.density,
  columns: state.columns,
  sort: state.sort,
  filter: state.filter,
  grouping: state.grouping,
  dataWindow: state.dataWindow,
});

export const isTableViewDirty = (
  schema: TableViewSchema,
  state: TableViewState,
  baseline: TableViewState,
) =>
  JSON.stringify(dirtyProjection(normalizeTableViewState(schema, state))) !==
  JSON.stringify(dirtyProjection(normalizeTableViewState(schema, baseline)));

const commandFocus = (
  schema: TableViewSchema,
  state: TableViewState,
  command: TableViewCommand,
): TableViewFocusTarget => {
  switch (command.type) {
    case 'column.visibility':
    case 'column.reorder':
    case 'column.resize':
    case 'column.pin':
      return { kind: 'column', columnId: command.columnId };
    case 'view.propose':
      return { kind: 'view', viewId: command.viewId };
    case 'view.reset':
      return { kind: 'view', viewId: state.viewId };
    case 'density.set':
    case 'sort.set':
    case 'filter.set':
    case 'grouping.set':
    case 'data-window.set':
      return { kind: 'table', tableId: schema.tableId };
  }
};

const commandValues = (
  command: TableViewCommand,
): Readonly<Record<string, string | number | boolean>> => {
  switch (command.type) {
    case 'column.visibility':
      return { columnId: command.columnId, visible: command.visible };
    case 'column.reorder':
      return { columnId: command.columnId, toIndex: command.toIndex };
    case 'column.resize':
      return { columnId: command.columnId, width: command.width };
    case 'column.pin':
      return { columnId: command.columnId, side: command.side };
    case 'density.set':
      return { density: command.density };
    case 'sort.set':
      return { clauseCount: command.sort.length };
    case 'filter.set':
      return { groupId: command.filter.groupId };
    case 'grouping.set':
      return { clauseCount: command.grouping.length };
    case 'view.propose':
      return { viewId: command.viewId };
    case 'view.reset':
      return { baselineViewId: command.baseline.viewId };
    case 'data-window.set':
      return {
        windowId: command.dataWindow.windowId,
        page: command.dataWindow.page,
        pageSize: command.dataWindow.pageSize,
      };
  }
};

const rejectedCommand = (
  schema: TableViewSchema,
  state: TableViewState,
  command: TableViewCommand,
  reason: TableViewRejectionReason,
): TableViewCommandResult => ({
  accepted: false,
  state,
  event: {
    type: 'rejected',
    commandType: command.type,
    reason,
    focus:
      validateTableViewSchema(schema).valid && validateTableViewState(schema, state).valid
        ? commandFocus(schema, state, command)
        : null,
    announcement: {
      messageId: 'command.rejected',
      values: { code: reason.code },
    },
  },
});

const reindexPinnedColumns = (
  columns: readonly TableViewColumnState[],
  side: Exclude<TableViewPinSide, 'none'>,
) => {
  const orderedIds = columns
    .filter(({ pinning }) => pinning.side === side)
    .sort((left, right) => (left.pinning.order ?? 0) - (right.pinning.order ?? 0))
    .map(({ columnId }) => columnId);
  const orderById = new Map(orderedIds.map((columnId, order) => [columnId, order]));
  return columns.map((column) =>
    column.pinning.side === side
      ? {
          ...column,
          pinning: { side, order: orderById.get(column.columnId)! },
        }
      : column,
  );
};

const updatePinning = (
  columns: readonly TableViewColumnState[],
  columnId: string,
  side: TableViewPinSide,
  requestedOrder: number | undefined,
) => {
  let next = columns.map((column) =>
    column.columnId === columnId
      ? { ...column, pinning: { side: 'none' as const, order: null } }
      : column,
  );
  next = reindexPinnedColumns(reindexPinnedColumns(next, 'start'), 'end');
  if (side === 'none') return next;

  const sideColumns = next
    .filter(({ pinning }) => pinning.side === side)
    .sort((left, right) => (left.pinning.order ?? 0) - (right.pinning.order ?? 0));
  const order = requestedOrder ?? sideColumns.length;
  if (!isNonNegativeInteger(order) || order > sideColumns.length) return null;

  const orderedIds = sideColumns.map(({ columnId: existingId }) => existingId);
  orderedIds.splice(order, 0, columnId);
  const orderById = new Map(orderedIds.map((existingId, index) => [existingId, index]));
  return next.map((column) =>
    orderById.has(column.columnId)
      ? {
          ...column,
          pinning: { side, order: orderById.get(column.columnId)! },
        }
      : column,
  );
};

export const applyTableViewCommand = (
  schema: TableViewSchema,
  state: TableViewState,
  command: TableViewCommand,
): TableViewCommandResult => {
  const schemaValidation = validateTableViewSchema(schema);
  if (!schemaValidation.valid) {
    return rejectedCommand(schema, state, command, schemaValidation.reason);
  }
  const stateValidation = validateTableViewState(schema, state);
  if (!stateValidation.valid) {
    return rejectedCommand(schema, state, command, stateValidation.reason);
  }

  let candidate: TableViewState;
  switch (command.type) {
    case 'column.visibility': {
      const columnSchema = schema.columns.find(({ columnId }) => columnId === command.columnId);
      if (columnSchema === undefined) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('unknown-column-id', 'command.columnId'),
        );
      }
      if (!command.visible && columnSchema.required) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('required-column-hidden', 'command.visible'),
        );
      }
      if (!command.visible && !columnSchema.capabilities.hideable) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('column-visibility-unsupported', 'command.visible'),
        );
      }
      candidate = {
        ...state,
        columns: state.columns.map((column) =>
          column.columnId === command.columnId ? { ...column, visible: command.visible } : column,
        ),
      };
      break;
    }
    case 'column.reorder': {
      const fromIndex = state.columns.findIndex(({ columnId }) => columnId === command.columnId);
      if (fromIndex < 0) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('unknown-column-id', 'command.columnId'),
        );
      }
      const columnSchema = schema.columns.find(({ columnId }) => columnId === command.columnId)!;
      if (!columnSchema.capabilities.reorderable) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('column-reorder-unsupported', 'command.columnId'),
        );
      }
      if (
        !Number.isInteger(command.toIndex) ||
        command.toIndex < 0 ||
        command.toIndex >= state.columns.length
      ) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('invalid-column-index', 'command.toIndex'),
        );
      }
      const columns = [...state.columns];
      const [column] = columns.splice(fromIndex, 1);
      columns.splice(command.toIndex, 0, column);
      candidate = { ...state, columns };
      break;
    }
    case 'column.resize': {
      const columnSchema = schema.columns.find(({ columnId }) => columnId === command.columnId);
      if (columnSchema === undefined) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('unknown-column-id', 'command.columnId'),
        );
      }
      if (!columnSchema.capabilities.resizable) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('column-resize-unsupported', 'command.columnId'),
        );
      }
      if (!Number.isFinite(command.width)) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('invalid-column-width', 'command.width'),
        );
      }
      const width = normalizeWidth(columnSchema, command.width);
      candidate = {
        ...state,
        columns: state.columns.map((column) =>
          column.columnId === command.columnId ? { ...column, width } : column,
        ),
      };
      break;
    }
    case 'column.pin': {
      const columnSchema = schema.columns.find(({ columnId }) => columnId === command.columnId);
      if (columnSchema === undefined) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('unknown-column-id', 'command.columnId'),
        );
      }
      if (columnSchema.pinningLocked) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('column-pinning-unsupported', 'command.columnId'),
        );
      }
      if (command.side !== 'none' && !columnSchema.capabilities.pinnable) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('column-pinning-unsupported', 'command.columnId'),
        );
      }
      const columns = updatePinning(state.columns, command.columnId, command.side, command.order);
      if (columns === null) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('invalid-pin-order', 'command.order'),
        );
      }
      candidate = { ...state, columns };
      break;
    }
    case 'density.set':
      candidate = { ...state, density: command.density };
      break;
    case 'sort.set':
      candidate = {
        ...state,
        sort: command.sort.map((sort) => ({ ...sort })),
      };
      break;
    case 'filter.set':
      candidate = { ...state, filter: command.filter };
      break;
    case 'grouping.set':
      candidate = {
        ...state,
        grouping: command.grouping.map((grouping) => ({ ...grouping })),
      };
      break;
    case 'view.propose':
      candidate = {
        ...state,
        viewId: command.viewId,
        baselineViewId: command.baselineViewId,
        provenance: command.provenance,
        label: command.label,
      };
      break;
    case 'view.reset': {
      const baselineValidation = validateTableViewState(schema, command.baseline);
      if (!baselineValidation.valid) {
        return rejectedCommand(schema, state, command, baselineValidation.reason);
      }
      if (command.baseline.viewId !== state.baselineViewId) {
        return rejectedCommand(
          schema,
          state,
          command,
          rejection('baseline-view-id-mismatch', 'command.baseline.viewId'),
        );
      }
      const normalizedBaseline = normalizeTableViewState(schema, command.baseline);
      candidate = {
        ...normalizedBaseline,
        viewId: state.viewId,
        baselineViewId: state.baselineViewId,
        provenance: state.provenance,
        label: state.label,
      };
      break;
    }
    case 'data-window.set':
      candidate = { ...state, dataWindow: { ...command.dataWindow } };
      break;
    default: {
      const unsupportedCommand: never = command;
      return rejectedCommand(
        schema,
        state,
        unsupportedCommand,
        rejection('unsupported-command', 'command.type'),
      );
    }
  }

  const candidateValidation = validateTableViewState(schema, candidate);
  if (!candidateValidation.valid) {
    return rejectedCommand(schema, state, command, candidateValidation.reason);
  }
  const normalized = normalizeTableViewState(schema, candidate);
  return {
    accepted: true,
    state: normalized,
    event: {
      type: 'accepted',
      commandType: command.type,
      focus: commandFocus(schema, normalized, command),
      announcement: {
        messageId: command.type,
        values: commandValues(command),
      },
    },
  };
};

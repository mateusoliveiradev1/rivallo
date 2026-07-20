import { invoke } from '@tauri-apps/api/core';

import { loadDataPackageCatalog } from '../data-editor/client.js';
import type {
  CareerBootData,
  CareerFailure,
  CareerSlot,
  CareerSlotSummary,
  CreateCareerRequest,
  ResolvedWorldDatabase,
  SaveCareerRequest,
} from './types.js';

const failure = (error: unknown): CareerFailure => {
  if (typeof error === 'object' && error !== null) {
    const value = error as Partial<CareerFailure>;
    if (typeof value.code === 'string' && typeof value.message === 'string') {
      return {
        code: value.code,
        message: value.message,
        details: Array.isArray(value.details)
          ? value.details.filter((item): item is string => typeof item === 'string')
          : [],
      };
    }
  }
  return {
    code: 'career.unexpected_failure',
    message: error instanceof Error ? error.message : String(error),
    details: [],
  };
};

const call = async <Result>(command: string, args?: Record<string, unknown>): Promise<Result> => {
  try {
    return await invoke<Result>(command, args);
  } catch (error) {
    throw failure(error);
  }
};

export const loadCareerBoot = async (
  onStage: (stage: 'catalog' | 'careers') => void,
): Promise<CareerBootData> => {
  onStage('catalog');
  const catalog = await loadDataPackageCatalog();
  onStage('careers');
  const [slots, lastCareer] = await Promise.all([
    call<CareerSlotSummary[]>('career_slots'),
    call<CareerSlotSummary | null>('last_valid_career'),
  ]);
  return { catalog, slots, lastCareer: lastCareer ?? slots[0] ?? null };
};

export const previewCareerComposition = (packageIds: readonly string[]) =>
  call<ResolvedWorldDatabase>('preview_career_composition', { packageIds: [...packageIds] });

export const createCareer = (request: CreateCareerRequest) =>
  call<CareerSlot>('create_career', { request });

export const loadCareer = (careerId: string) => call<CareerSlot>('load_career', { careerId });

export const saveCareer = (request: SaveCareerRequest) =>
  call<CareerSlot>('save_career', { request });

export const renameCareer = (careerId: string, displayName: string) =>
  call<CareerSlotSummary>('rename_career', { careerId, displayName });

export const createCareerBackup = (careerId: string) =>
  call<CareerSlotSummary>('create_career_backup', { careerId });

export const loadCareerBackups = (careerId: string) =>
  call<string[]>('career_backups', { careerId });

export const restoreCareerBackup = (careerId: string, backupName: string) =>
  call<CareerSlot>('restore_career_backup', { careerId, backupName });

export const deleteCareer = (careerId: string) => call<void>('delete_career', { careerId });

export const exitApplication = () => call<void>('exit_application');

export const operationId = (prefix: string) => {
  const cryptoApi = globalThis.crypto;
  const suffix =
    cryptoApi && 'randomUUID' in cryptoApi
      ? cryptoApi.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${suffix}`;
};

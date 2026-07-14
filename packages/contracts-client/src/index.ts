export * from './generated/index.js';
export { client } from './generated/client.gen.js';
export type { CreateClientConfig } from './generated/client.gen.js';
export { createClient, createConfig, mergeHeaders } from './generated/client/index.js';
export type {
  Client,
  ClientOptions,
  Config,
  CreateClientConfig as ClientConfiguration,
  Options,
  RequestOptions,
  RequestResult,
  ResolvedRequestOptions,
  ResponseStyle,
  TDataShape,
} from './generated/client/index.js';

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "history" (padrão) ou "hash" */
  readonly VITE_ROUTER_MODE?: 'history' | 'hash';
  readonly VITE_BASE?: string;
}

import type { ExploreState } from './site-types.mjs';
export declare const DEFAULT_EXPLORE: Readonly<ExploreState>;
export declare function parseExplore(search: string): ExploreState;
export declare function serializeExplore(s: ExploreState): string;
export declare const PRESETS: readonly { id: string; label: string; patch: Partial<ExploreState> }[];

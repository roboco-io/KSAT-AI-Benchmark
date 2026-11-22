import type { PlacedPoint } from './site-types.mjs';
export declare function scatterLayout(
  points: { id: string; x: number; y: number }[],
  opts: { width: number; height: number; pad: number; xLog: boolean; yLog: boolean; labelWidth: (id: string) => number },
): PlacedPoint[];
export declare function axisTicks(min: number, max: number, log: boolean): number[];

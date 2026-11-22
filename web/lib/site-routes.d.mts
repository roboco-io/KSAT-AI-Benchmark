export declare function yearPath(year: number): string;
export declare function modelPath(year: number, id: string): string;
export declare function questionsPath(year: number, subject?: string): string;
export declare function questionPath(year: number, questionId: string): string;
export declare function comparePath(year: number, ids: string[]): string;
export declare function parseCompare(search: string): string[];
export declare function legacyRedirect(search: string, hash: string, fallbackYear?: number): string | null;

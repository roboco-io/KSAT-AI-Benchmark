import type { CompareData, Matrix, QuestionDetail, QuestionFilter, Rescore, SubjectKey, YearView } from './site-types.mjs';
export declare function questionMatrix(view: YearView, subject: SubjectKey): Matrix;
export declare function questionDetail(view: YearView, id: string): QuestionDetail | null;
export declare function compareData(view: YearView): CompareData;
export declare function disagreements(data: CompareData, ids: string[]): string[];
export declare function filterQuestions(data: CompareData, f: QuestionFilter): string[];
export declare function rescore(data: CompareData, questionIds: string[]): Record<string, Rescore>;

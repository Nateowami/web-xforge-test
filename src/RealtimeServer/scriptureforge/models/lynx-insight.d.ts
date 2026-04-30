export declare const LynxInsightTypes: readonly ['info', 'warning', 'error'];
export type LynxInsightType = (typeof LynxInsightTypes)[number];
export declare const LynxInsightFilterScopes: readonly ['project', 'book', 'chapter'];
export type LynxInsightFilterScope = (typeof LynxInsightFilterScopes)[number];
export declare const LynxInsightSortOrders: readonly ['severity', 'appearance'];
export type LynxInsightSortOrder = (typeof LynxInsightSortOrders)[number];
export interface LynxInsightFilter {
  types: LynxInsightType[];
  scope: LynxInsightFilterScope;
  includeDismissed?: boolean;
}

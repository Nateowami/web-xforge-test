import { ObjProxyArg } from 'ts-object-path';
export declare const ANY_KEY = '*';
export declare const ANY_INDEX = -1;
export type PathItem = string | number | symbol;
export declare function getValue<T>(
  object: any,
  path: PathItem[],
  defaultValue?: T | null | undefined
): T | null | undefined;
export declare function obj<T>(): ObjPathBuilder<T>;
export declare class ObjPathBuilder<T> {
  path<TField>(field?: ObjProxyArg<T, TField>): PathItem[];
  pathStr<TField>(field?: ObjProxyArg<T, TField>): string;
  pathTemplate<TField>(field?: ObjProxyArg<T, TField>, inherit?: boolean): ObjPathTemplate;
}
/**
 * This class represents the generic template for a path to a property in an object.
 */
export declare class ObjPathTemplate {
  readonly template: PathItem[];
  readonly inherit: boolean;
  constructor(template?: PathItem[], inherit?: boolean);
  matches(path: Readonly<PathItem[]>): boolean;
}

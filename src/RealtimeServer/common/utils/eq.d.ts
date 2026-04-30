/**
 * `eq` checks the equality of two objects.
 *
 * The properties belonging to objects (but not their prototypes) will be
 * traversed deeply and compared.
 *
 * Includes special handling for strings, numbers, dates, booleans, regexes, and
 * arrays.
 *
 * The semantics of this implementation is more correct for real-time data than Lodash "isEqual", because it treats a
 * property that is explicitly assigned "undefined" as equal to a property that is not defined.
 */
export declare function eq(a: any, b: any): boolean;

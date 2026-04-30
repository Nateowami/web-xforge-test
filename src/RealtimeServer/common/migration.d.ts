import { Doc, RawOp } from 'sharedb/lib/client';
export interface MigrationConstructor {
  readonly VERSION: number;
  new (): Migration;
}
/**
 * This interface represents a data migration for a schema change. A migration can only be applied to one collection.
 */
export interface Migration {
  /**
   * Migrates the specified doc to a new schema version. The "submitMigrationOp" function MUST be used to submit any
   * data migration changes to the doc.
   *
   * @param {Doc} doc The doc to migrate.
   */
  migrateDoc(doc: Doc): Promise<void>;
  /**
   * Migrates the specified op to a new schema version.
   *
   * @param {RawOp} op The op to migrate.
   */
  migrateOp(op: RawOp): void;
}
export declare abstract class DocMigration implements Migration {
  abstract migrateDoc(doc: Doc): Promise<void>;
  migrateOp(_op: RawOp): void;
}
/**
 * Verifies that the specified migrations are have version numbers monotonically increasing by 1 and that the class
 * names include the version number. Throws an error if any of the migrations violate this rule. Otherwise, returns the
 * migrations.
 */
export declare function monotonicallyIncreasingMigrationList(
  migrations: MigrationConstructor[]
): MigrationConstructor[];

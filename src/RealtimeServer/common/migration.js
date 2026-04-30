'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DocMigration = void 0;
exports.monotonicallyIncreasingMigrationList = monotonicallyIncreasingMigrationList;
class DocMigration {
  migrateOp(_op) {
    // do nothing
  }
}
exports.DocMigration = DocMigration;
/**
 * Verifies that the specified migrations are have version numbers monotonically increasing by 1 and that the class
 * names include the version number. Throws an error if any of the migrations violate this rule. Otherwise, returns the
 * migrations.
 */
function monotonicallyIncreasingMigrationList(migrations) {
  for (const [index, migration] of migrations.entries()) {
    const expectedVersion = index + 1;
    if (migration.VERSION !== expectedVersion) {
      throw new Error(`Migration version mismatch: expected ${expectedVersion}, got ${migration.VERSION}`);
    }
    if (!migration.name.includes(migration.VERSION.toString())) {
      throw new Error(`Migration class name must include the version number: ${migration.name}`);
    }
  }
  return migrations;
}
//# sourceMappingURL=migration.js.map

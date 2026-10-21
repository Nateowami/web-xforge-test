import { Doc, Op } from 'sharedb/lib/client';
import { DocMigration, MigrationConstructor, monotonicallyIncreasingMigrationList } from '../../common/migration';

class QuestionMigration1 extends DocMigration {
  static readonly VERSION = 1;

  async migrateDoc(doc: Doc): Promise<void> {
    const ops: Op[] = [];
    for (let i = 0; i < doc.data.answers.length; i++) {
      if (doc.data.answers[i].deleted == null) {
        ops.push({ p: ['answers', i, 'deleted'], oi: false });
      }
      for (let j = 0; j < doc.data.answers[i].comments.length; j++) {
        if (doc.data.answers[i].comments[j].deleted == null) {
          ops.push({ p: ['answers', i, 'comments', j, 'deleted'], oi: false });
        }
      }
    }

    if (ops.length > 0) {
      await this.submitMigrationOp(doc, ops);
    }
  }
}

/**
 * Removes repeated likes by the same user on an answer, keeping the first. These were created when a user liked an
 * answer on two clients while offline (SF-1044).
 */
class QuestionMigration2 extends DocMigration {
  static readonly VERSION = 2;

  async migrateDoc(doc: Doc): Promise<void> {
    const ops: Op[] = [];
    if (doc.data.answers == null) return;
    for (let i = 0; i < doc.data.answers.length; i++) {
      const likes: { ownerRef: string }[] | undefined = doc.data.answers[i].likes;
      if (likes == null) continue;
      // Remove from the end so the indexes of the likes still to be removed are not shifted
      for (let j = likes.length - 1; j >= 0; j--) {
        if (likes.findIndex(l => l.ownerRef === likes[j].ownerRef) < j) {
          ops.push({ p: ['answers', i, 'likes', j], ld: likes[j] });
        }
      }
    }

    if (ops.length > 0) {
      await this.submitMigrationOp(doc, ops);
    }
  }
}

export const QUESTION_MIGRATIONS: MigrationConstructor[] = monotonicallyIncreasingMigrationList([
  QuestionMigration1,
  QuestionMigration2
]);

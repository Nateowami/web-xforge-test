import { createDeletionFileData, createStorageFileData, createUploadFileData } from './models/file-offline-data';
import { RealtimeOfflineData } from './models/realtime-offline-data';
import { MemoryOfflineStore } from './memory-offline-store';

describe('OfflineStore', () => {
  describe('hasUnsavedChanges', () => {
    it('returns false when the store is empty', async () => {
      const store = new MemoryOfflineStore();
      expect(await store.hasUnsavedChanges()).toBe(false);
    });

    it('returns false when no doc has pending ops', async () => {
      const store = new MemoryOfflineStore();
      store.addData('texts', createOfflineDoc('text01', []));
      expect(await store.hasUnsavedChanges()).toBe(false);
    });

    it('returns true when a doc has pending ops', async () => {
      const store = new MemoryOfflineStore();
      store.addData('texts', createOfflineDoc('text01', []));
      store.addData('questions', createOfflineDoc('question01', [{ op: {} }]));
      expect(await store.hasUnsavedChanges()).toBe(true);
    });

    it('returns true when a file is waiting to be uploaded', async () => {
      const store = new MemoryOfflineStore();
      store.addData(
        'audio',
        createUploadFileData('questions', 'audio01', 'project01', 'question01', new Blob(), 'audio.mp3')
      );
      expect(await store.hasUnsavedChanges()).toBe(true);
    });

    it('returns true when a file is waiting to be deleted', async () => {
      const store = new MemoryOfflineStore();
      store.addData('audio', createDeletionFileData('questions', 'audio01', 'project01', 'user01'));
      expect(await store.hasUnsavedChanges()).toBe(true);
    });

    it('returns false for a file that is only cached for offline use', async () => {
      const store = new MemoryOfflineStore();
      store.addData('audio', createStorageFileData('questions', 'audio01', '/audio01.mp3', new Blob()));
      expect(await store.hasUnsavedChanges()).toBe(false);
    });
  });
});

function createOfflineDoc(id: string, pendingOps: any[]): RealtimeOfflineData {
  return { id, v: 1, data: {}, type: 'rich-text', pendingOps };
}

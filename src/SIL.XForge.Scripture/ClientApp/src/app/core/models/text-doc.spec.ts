import { TestBed } from '@angular/core/testing';
import { Delta } from 'quill';
import { TextData } from 'realtime-server/lib/esm/scriptureforge/models/text-data';
import * as RichText from 'rich-text';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { configureTestingModule } from 'xforge-common/test-utils';
import { getCombinedVerseTextDoc } from '../../shared/test-utils';
import { SF_TYPE_REGISTRY } from './sf-type-registry';
import { TextDoc, TextDocId } from './text-doc';

describe('TextDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  describe('getVerseNumbers', () => {
    it('includes every verse of bridges and sequences, and segmented verses once', async () => {
      const env = new TestEnvironment();
      const textDoc: TextDoc = await env.setupDoc(getCombinedVerseTextDoc(env.textDocId));

      expect([...textDoc.getVerseNumbers()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('ignores right to left marks in verse numbers', async () => {
      const env = new TestEnvironment();
      const textDoc: TextDoc = await env.setupDoc(getCombinedVerseTextDoc(env.textDocId, true));

      expect([...textDoc.getVerseNumbers()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('leaves out a verse that has no verse marker', async () => {
      const env = new TestEnvironment();
      const textDoc: TextDoc = await env.setupDoc(env.chapterWithVerses(['1', '2', '4']));

      expect([...textDoc.getVerseNumbers()]).toEqual([1, 2, 4]);
    });

    it('is empty when the chapter has no verse markers', async () => {
      const env = new TestEnvironment();
      const textDoc: TextDoc = await env.setupDoc(env.chapterWithVerses([]));

      expect(textDoc.getVerseNumbers().size).toEqual(0);
    });
  });
});

class TestEnvironment {
  readonly realtimeService: TestRealtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);
  readonly textDocId = new TextDocId('project01', 62, 1);

  setupDoc(data: TextData): Promise<TextDoc> {
    this.realtimeService.addSnapshot<TextData>(TextDoc.COLLECTION, {
      id: this.textDocId.toString(),
      type: RichText.type.name,
      data: data
    });
    return this.realtimeService.subscribe(TextDoc.COLLECTION, this.textDocId.toString());
  }

  chapterWithVerses(verses: string[]): TextData {
    const delta = new Delta();
    delta.insert({ chapter: { number: '1', style: 'c' } });
    delta.insert({ blank: true }, { segment: 'p_1' });
    for (const verse of verses) {
      delta.insert({ verse: { number: verse, style: 'v' } });
      delta.insert(`verse ${verse}`, { segment: `verse_1_${verse}` });
    }
    delta.insert('\n', { para: { style: 'p' } });
    return delta;
  }
}

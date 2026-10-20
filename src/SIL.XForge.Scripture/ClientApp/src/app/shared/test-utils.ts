import { Delta } from 'quill';
import { ParatextUserProfile } from 'realtime-server/lib/esm/scriptureforge/models/paratext-user-profile';
import { isParatextRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { TextData } from 'realtime-server/lib/esm/scriptureforge/models/text-data';
import { TextDocId } from '../core/models/text-doc';
import { RIGHT_TO_LEFT_MARK } from './verse-utils';

export function getTextDoc(id: TextDocId): TextData {
  const delta = new Delta();
  delta.insert(`Title for chapter ${id.chapterNum}`, { segment: 's_1' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ chapter: { number: id.chapterNum.toString(), style: 'c' } });
  delta.insert({ blank: true }, { segment: 'p_1' });
  delta.insert({ verse: { number: '1', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 1.`, { segment: `verse_${id.chapterNum}_1` });
  delta.insert({ verse: { number: '2', style: 'v' } });
  delta.insert({ blank: true }, { segment: `verse_${id.chapterNum}_2` });
  delta.insert({ verse: { number: '3', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 3.`, { segment: `verse_${id.chapterNum}_3` });
  delta.insert({ verse: { number: '4', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 4.`, { segment: `verse_${id.chapterNum}_4` });
  delta.insert('\n', { para: { style: 'p' } });
  delta.insert({ blank: true }, { segment: `verse_${id.chapterNum}_4/p_1` });
  delta.insert({ verse: { number: '5', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, `, { segment: `verse_${id.chapterNum}_5` });
  delta.insert('\n', { para: { style: 'p' } });
  delta.insert({ blank: true }, { segment: `verse_${id.chapterNum}_5/p_1` });
  delta.insert({ verse: { number: '6', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 6. `, { segment: `verse_${id.chapterNum}_6` });
  delta.insert('\n', { para: { style: 'p' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 7.`, { segment: `verse_${id.chapterNum}_7` });
  delta.insert('\n', { para: { style: 'p' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 7 - 2nd paragraph.`, {
    segment: `verse_${id.chapterNum}_7/p_1`
  });
  return delta;
}

export function getCombinedVerseTextDoc(id: TextDocId, rtl: boolean = false): TextData {
  const verse2Str: string = rtl ? `2${RIGHT_TO_LEFT_MARK}-3` : '2-3';
  const verse5Str: string = rtl ? `5${RIGHT_TO_LEFT_MARK},7` : '5,7';
  const delta = new Delta();
  delta.insert(`Title for chapter ${id.chapterNum}`, { segment: 's_1' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ chapter: { number: id.chapterNum.toString(), style: 'c' } });
  delta.insert({ blank: true }, { segment: 'p_1' });
  delta.insert({ verse: { number: '1', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 1.`, { segment: `verse_${id.chapterNum}_1` });
  delta.insert({ verse: { number: verse2Str, style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 2-3.`, {
    segment: `verse_${id.chapterNum}_${verse2Str}`
  });
  delta.insert('\n', { para: { style: 'p' } });
  delta.insert('Text in section heading', { segment: 's_2' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ blank: true }, { segment: 'p_2' });
  delta.insert({ verse: { number: '4', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 4.`, { segment: `verse_${id.chapterNum}_4` });
  delta.insert({ verse: { number: verse5Str, style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 5,7.`, {
    segment: `verse_${id.chapterNum}_${verse5Str}`
  });
  delta.insert({ verse: { number: '6a', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 6a.`, { segment: `verse_${id.chapterNum}_6a` });
  delta.insert({ verse: { number: '6b', style: 'v' } });
  delta.insert(`${id.textType}: chapter ${id.chapterNum}, verse 6b.`, { segment: `verse_${id.chapterNum}_6b` });
  delta.insert('\n', { para: { style: 'p' } });
  return delta;
}

export function getPoetryVerseTextDoc(id: TextDocId): TextData {
  const delta = new Delta();
  delta.insert(`Title for chapter ${id.chapterNum}`, { segment: 's_1' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ chapter: { number: id.chapterNum.toString(), style: 'c' } });
  delta.insert({ blank: true }, { segment: 'q_1' });
  delta.insert({ verse: { number: '1', style: 'v' } });
  delta.insert('Poetry first line', { segment: `verse_${id.chapterNum}_1` });
  delta.insert('\n', { para: { style: 'q' } });
  delta.insert('Poetry second line', { segment: `verse_${id.chapterNum}_1/q_1` });
  delta.insert('\n', { para: { style: 'q' } });
  delta.insert('\n', { para: { style: 'b' } });
  delta.insert('Poetry third line', { segment: `verse_${id.chapterNum}_1/q_2` });
  delta.insert('\n', { para: { style: 'q' } });
  delta.insert('Poetry fourth line.', { segment: `verse_${id.chapterNum}_1/q_3` });
  delta.insert('\n', { para: { style: 'q' } });
  return delta;
}

export function getEmptyChapterDoc(id: TextDocId): TextData {
  const delta = new Delta();
  delta.insert({ blank: true }, { segment: 's_1' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ chapter: { number: id.chapterNum.toString(), style: 'c' } });
  delta.insert({ blank: true }, { segment: 's_2' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ blank: true }, { segment: 'p_1' });
  delta.insert({ verse: { number: '1', style: 'v' } });
  delta.insert({ blank: true }, { segment: 'verse_1_1' });
  delta.insert({ verse: { number: '2', style: 'v' } });
  delta.insert({ blank: true }, { segment: 'verse_1_2' });
  delta.insert('\n', { para: { style: 'p' } });
  delta.insert({ blank: true }, { segment: 's_3' });
  delta.insert('\n', { para: { style: 's' } });
  delta.insert({ blank: true }, { segment: 'p_2' });
  delta.insert({ verse: { number: '3', style: 'v' } });
  delta.insert({ blank: true }, { segment: 'verse_1_3' });
  delta.insert('\n', { para: { style: 'p' } });
  return delta;
}

export function paratextUsersFromRoles(userRoles: { [id: string]: string }): ParatextUserProfile[] {
  return Object.keys(userRoles)
    .filter(u => isParatextRole(userRoles[u]))
    .map(u => ({ sfUserId: u, username: `pt${u}`, opaqueUserId: `opaque${u}`, role: userRoles[u] }));
}

// Function to create a mock MediaStream with an audio track
export const createMockMediaStream = (): MediaStream => {
  // Use the MediaStream constructor to simulate a stream with an audio track
  const audioContext: AudioContext = new window.AudioContext();
  const oscillator: OscillatorNode = audioContext.createOscillator();
  const destination: MediaStreamAudioDestinationNode = audioContext.createMediaStreamDestination();

  oscillator.connect(destination);
  oscillator.start();

  return destination.stream;
};

/**
 * Replaces ResizeObserver with a fake for the current spec, so that a spec can simulate an element being shown or
 * hidden, such as by switching tabs, without waiting for the browser to lay out the page.
 */
export function fakeResizeObserver(): { setShown(element: Element, shown: boolean): void } {
  const observed: { element: Element; observer: FakeResizeObserver }[] = [];

  class FakeResizeObserver implements ResizeObserver {
    constructor(readonly callback: ResizeObserverCallback) {}

    observe(element: Element): void {
      observed.push({ element, observer: this });
    }

    unobserve(element: Element): void {
      remove(o => o.observer === this && o.element === element);
    }

    disconnect(): void {
      remove(o => o.observer === this);
    }
  }

  function remove(predicate: (o: (typeof observed)[number]) => boolean): void {
    for (let i = observed.length - 1; i >= 0; i--) {
      if (predicate(observed[i])) observed.splice(i, 1);
    }
  }

  spyOn(window, 'ResizeObserver').and.callFake(FakeResizeObserver as any);
  return {
    setShown: (element: Element, shown: boolean) => {
      const size: number = shown ? 100 : 0;
      const contentRect = new DOMRectReadOnly(0, 0, size, size);
      for (const o of observed.filter(o => o.element === element)) {
        o.observer.callback([{ target: element, contentRect } as ResizeObserverEntry], o.observer);
      }
    }
  };
}

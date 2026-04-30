import { ProjectData } from '../../common/models/project-data';
import { AudioTiming } from './audio-timing';
export declare const TEXT_AUDIO_COLLECTION = 'text_audio';
export declare const TEXT_AUDIO_INDEX_PATHS: string[];
export declare function getTextAudioId(projectId: string, bookNum: number, chapterNum: number): string;
export interface TextAudio extends ProjectData {
  dataId: string;
  timings: AudioTiming[];
  mimeType: string;
  audioUrl: string;
}

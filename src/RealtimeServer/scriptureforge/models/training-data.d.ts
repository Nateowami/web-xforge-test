import { ProjectData } from '../../common/models/project-data';
export declare const TRAINING_DATA_COLLECTION = 'training_data';
export declare const TRAINING_DATA_INDEX_PATHS: string[];
export declare function getTrainingDataId(projectId: string, dataId: string): string;
export interface TrainingData extends ProjectData {
  dataId: string;
  fileUrl: string;
  mimeType: string;
  skipRows: number;
  title: string;
  deleted?: boolean;
}

import { TestBed } from '@angular/core/testing';
import { QuestionDoc } from '../../app/core/models/question-doc';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { RealtimeService } from '../realtime.service';
import { provideTestRealtime } from '../test-realtime-providers';
import { configureTestingModule } from '../test-utils';

const docId = 'project01:question01';

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  describe('creating in the backend', () => {
    it('ignores the error reported when the doc has already been created', async () => {
      const realtimeService = TestBed.inject(RealtimeService);
      const doc = realtimeService.get(QuestionDoc.COLLECTION, docId);
      spyOn(doc.adapter, 'create').and.rejectWith(createError('ERR_DOC_ALREADY_CREATED'));
      const updateOfflineData = spyOn(doc, 'updateOfflineData').and.callThrough();

      await expectAsync(doc['createInBackend']({})).toBeResolved();

      expect(updateOfflineData).toHaveBeenCalled();
    });

    it('reports any other error', async () => {
      const realtimeService = TestBed.inject(RealtimeService);
      const doc = realtimeService.get(QuestionDoc.COLLECTION, docId);
      spyOn(doc.adapter, 'create').and.rejectWith(createError('ERR_OP_SUBMIT_REJECTED'));

      await expectAsync(doc['createInBackend']({})).toBeRejected();
    });
  });
});

function createError(code: string): Error {
  const error = new Error(`Error with code ${code}`);
  error['code'] = code;
  return error;
}

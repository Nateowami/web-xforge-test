import { Meta } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { instance, mock, when } from 'ts-mockito';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { getOverlay, MatDialogLaunchComponent, matDialogStory } from '../../../../.storybook/util/mat-dialog-launch';
import { DeleteProjectDialogComponent } from './delete-project-dialog.component';

const meta: Meta = {
  title: 'Settings/Delete Project',
  component: MatDialogLaunchComponent
};
export default meta;

const onlineStatusService = mock(OnlineStatusService);
when(onlineStatusService.isOnline).thenReturn(true);
const offlineStatusService = mock(OnlineStatusService);
when(offlineStatusService.isOnline).thenReturn(false);
const onlineConfig = { providers: [{ provide: OnlineStatusService, useValue: instance(onlineStatusService) }] };
const offlineConfig = { providers: [{ provide: OnlineStatusService, useValue: instance(offlineStatusService) }] };

export const DeleteProjectInvalidDialog = matDialogStory(DeleteProjectDialogComponent, onlineConfig);
DeleteProjectInvalidDialog.args = { data: { name: 'My Project' } };
DeleteProjectInvalidDialog.play = async ({ canvasElement }) => {
  const overlay = within(getOverlay(canvasElement));

  const submitButton = overlay.getByRole('button', {
    name: /I understand the consequences, delete this project/i
  });
  expect(submitButton).toBeDisabled();

  const projectInput = overlay.getByRole('textbox');
  await userEvent.type(projectInput, 'Other Project');

  expect(submitButton).toBeDisabled();
};

export const DeleteProjectValidDialog = matDialogStory(DeleteProjectDialogComponent, onlineConfig);
DeleteProjectValidDialog.args = { data: { name: 'My Project' } };
DeleteProjectValidDialog.play = async ({ canvasElement }) => {
  const overlay = within(getOverlay(canvasElement));

  const submitButton = overlay.getByRole('button', {
    name: /I understand the consequences, delete this project/i
  });
  expect(submitButton).toBeDisabled();

  const projectInput = overlay.getByRole('textbox');
  await userEvent.type(projectInput, 'My Project');

  expect(submitButton).toBeEnabled();
};

export const DeleteProjectOfflineDialog = matDialogStory(DeleteProjectDialogComponent, offlineConfig);
DeleteProjectOfflineDialog.args = { data: { name: 'My Project' } };
DeleteProjectOfflineDialog.play = async ({ canvasElement }) => {
  const overlay = within(getOverlay(canvasElement));

  const submitButton = overlay.getByRole('button', {
    name: /I understand the consequences, delete this project/i
  });
  const projectInput = overlay.getByRole('textbox');
  await userEvent.type(projectInput, 'My Project');

  expect(submitButton).toBeDisabled();
  expect(overlay.getByText(/Projects cannot be deleted while offline/i)).toBeInTheDocument();
};

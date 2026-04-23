import { Meta } from '@storybook/angular';
import { AvatarComponent } from 'xforge-common/avatar/avatar.component';
import { MatDialogLaunchComponent, matDialogStory } from '../../../.storybook/util/mat-dialog-launch';
import { SaUserDetailsDialogComponent } from './sa-user-details-dialog.component';

export default {
  title: 'System Admin',
  component: MatDialogLaunchComponent
} as Meta;

export const UserDetailsDialog = matDialogStory(SaUserDetailsDialogComponent, {
  imports: [AvatarComponent]
});

UserDetailsDialog.args = {
  data: {
    user: {
      displayName: 'Billy T James',
      name: 'William T James',
      email: 'user01@example.com'
    }
  }
};

export const UserDetailsDialogSameDisplayAndFullName = matDialogStory(SaUserDetailsDialogComponent, {
  imports: [AvatarComponent]
});

UserDetailsDialogSameDisplayAndFullName.args = {
  data: {
    user: {
      displayName: 'Jane Smith',
      name: 'Jane Smith',
      email: 'jane@example.com'
    }
  }
};

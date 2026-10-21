import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { anything, instance, mock, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { NotificationServiceBase } from './notification-service-base';

const SERVER_TIMEOUT_MESSAGE = 'Server timeout elapsed without receiving a message from the server.';

describe('NotificationServiceBase', () => {
  describe('subscribeToProject', () => {
    it('suppresses the error when the connection drops while offline', async () => {
      const env = new TestEnvironment();
      when(env.mockedConnection.invoke('subscribeToProject', anything())).thenCall(() => {
        env.isOnline = false;
        return Promise.reject(new Error(SERVER_TIMEOUT_MESSAGE));
      });

      await expectAsync(env.service.subscribeToProject('project01')).toBeResolved();
    });

    it('suppresses the error when the invocation is canceled because the connection closed', async () => {
      const env = new TestEnvironment();
      when(env.mockedConnection.invoke('subscribeToProject', anything())).thenReject(
        new Error('Invocation canceled due to the underlying connection being closed.')
      );

      await expectAsync(env.service.subscribeToProject('project01')).toBeResolved();
    });

    it('rethrows other errors while online', async () => {
      const env = new TestEnvironment();
      when(env.mockedConnection.invoke('subscribeToProject', anything())).thenReject(new Error('Unauthorized'));

      await expectAsync(env.service.subscribeToProject('project01')).toBeRejectedWithError('Unauthorized');
    });
  });
});

class TestNotificationService extends NotificationServiceBase {
  constructor(authService: AuthService, onlineService: OnlineStatusService, connection: HubConnection) {
    super(authService, onlineService);
    this.connection = connection;
  }
}

class TestEnvironment {
  readonly mockedConnection = mock(HubConnection);
  readonly service: TestNotificationService;
  isOnline = true;

  constructor() {
    const mockedOnlineStatusService = mock(OnlineStatusService);
    when(mockedOnlineStatusService.isOnline).thenCall(() => this.isOnline);
    when(mockedOnlineStatusService.isBrowserOnline).thenCall(() => this.isOnline);
    when(this.mockedConnection.state).thenReturn(HubConnectionState.Connected);
    this.service = new TestNotificationService(
      instance(mock(AuthService)),
      instance(mockedOnlineStatusService),
      instance(this.mockedConnection)
    );
  }
}

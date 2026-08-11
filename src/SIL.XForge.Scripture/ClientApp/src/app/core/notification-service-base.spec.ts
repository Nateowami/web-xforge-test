import { TestBed } from '@angular/core/testing';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { instance, mock } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { NotificationServiceBase } from './notification-service-base';

const mockedAuthService = mock(AuthService);

/** A hub connection whose state and invoke result the test controls. */
class TestHubConnection {
  state: HubConnectionState = HubConnectionState.Connected;
  invokeError?: Error;

  async invoke(): Promise<void> {
    if (this.invokeError != null) throw this.invokeError;
  }
}

class TestNotificationService extends NotificationServiceBase {
  constructor(
    onlineStatus: TestOnlineStatusService,
    readonly testConnection: TestHubConnection
  ) {
    super(instance(mockedAuthService), onlineStatus);
    this.connection = testConnection as unknown as HubConnection;
  }
}

describe('NotificationServiceBase', () => {
  let onlineStatus: TestOnlineStatusService;
  let connection: TestHubConnection;
  let service: TestNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestOnlineStatusService, provideTestOnlineStatus()] });
    onlineStatus = TestBed.inject(TestOnlineStatusService);
    connection = new TestHubConnection();
    service = new TestNotificationService(onlineStatus, connection);
  });

  it('subscribes when connected', async () => {
    await expectAsync(service.subscribeToProject('project01')).toBeResolved();
  });

  it('suppresses the error when the connection dropped mid-invocation', async () => {
    // What SignalR rejects a pending invocation with when the app stops hearing from the server (e.g. it went
    // offline): the connection is torn down and the invocation fails with the error that closed it.
    connection.invokeError = new Error('Server timeout elapsed without receiving a message from the server.');
    connection.state = HubConnectionState.Reconnecting;

    await expectAsync(service.subscribeToProject('project01')).toBeResolved();
  });

  it('suppresses the error when the app is offline', async () => {
    connection.invokeError = new Error('Server timeout elapsed without receiving a message from the server.');
    onlineStatus.setIsOnline(false);

    await expectAsync(service.subscribeToProject('project01')).toBeResolved();
  });

  it('reports an error from a connection that is still usable', async () => {
    connection.invokeError = new Error('Something went wrong on the server');

    await expectAsync(service.subscribeToProject('project01')).toBeRejected();
  });
});

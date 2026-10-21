import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { anything, instance, mock, reset, verify, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { NotificationServiceBase } from './notification-service-base';

const mockAuthService = mock(AuthService);
const mockOnlineStatusService = mock(OnlineStatusService);
const mockHubConnection = mock(HubConnection);

class TestNotificationService extends NotificationServiceBase {
  constructor() {
    super(instance(mockAuthService), instance(mockOnlineStatusService));
    this.connection = instance(mockHubConnection);
  }
}

describe('NotificationServiceBase', () => {
  let state: HubConnectionState;

  beforeEach(() => {
    reset(mockHubConnection);
    state = HubConnectionState.Disconnected;
    when(mockHubConnection.state).thenCall(() => state);
    when(mockHubConnection.start()).thenCall(async () => {
      state = HubConnectionState.Connected;
    });
    when(mockHubConnection.stop()).thenCall(async () => {
      state = HubConnectionState.Disconnected;
    });
    when(mockHubConnection.invoke(anything(), anything())).thenResolve();
  });

  it('starts a disconnected connection', async () => {
    const service = new TestNotificationService();

    await service.start();

    verify(mockHubConnection.start()).once();
    expect(service.isConnected).toBe(true);
  });

  it('restarts a connection that is waiting to reconnect, so that the project can be subscribed to', async () => {
    const service = new TestNotificationService();
    state = HubConnectionState.Reconnecting;

    await service.start();
    await service.subscribeToProject('project01');

    verify(mockHubConnection.stop()).once();
    verify(mockHubConnection.start()).once();
    verify(mockHubConnection.invoke('subscribeToProject', 'project01')).once();
    expect(service.isConnected).toBe(true);
  });

  it('does not restart a connected connection', async () => {
    const service = new TestNotificationService();
    state = HubConnectionState.Connected;

    await service.start();

    verify(mockHubConnection.stop()).never();
    verify(mockHubConnection.start()).never();
  });
});

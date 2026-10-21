import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';
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
    reset(mockOnlineStatusService);
    state = HubConnectionState.Disconnected;
    when(mockHubConnection.state).thenCall(() => state);
    when(mockHubConnection.start()).thenCall(async () => {
      state = HubConnectionState.Connected;
    });
    when(mockHubConnection.stop()).thenCall(async () => {
      state = HubConnectionState.Disconnected;
    });
    when(mockHubConnection.invoke(anything(), anything())).thenResolve();
    when(mockOnlineStatusService.isOnline).thenReturn(true);
    when(mockOnlineStatusService.isBrowserOnline).thenReturn(true);
  });

  it('starts a disconnected connection', async () => {
    const service = new TestNotificationService();

    await service.start();

    verify(mockHubConnection.start()).once();
    expect(service.isConnected).toBe(true);
  });

  it('restarts a connection that is waiting to reconnect, and subscribes to its projects again', async () => {
    const service = new TestNotificationService();
    state = HubConnectionState.Connected;
    await service.start();
    await service.subscribeToProject('project01');
    state = HubConnectionState.Reconnecting;

    await service.start();
    await service.subscribeToProject('project02');

    verify(mockHubConnection.stop()).once();
    verify(mockHubConnection.start()).once();
    verify(mockHubConnection.invoke('subscribeToProject', 'project01')).twice();
    verify(mockHubConnection.invoke('subscribeToProject', 'project02')).once();
    expect(service.isConnected).toBe(true);
  });

  it('leaves automatic reconnect running if offline', async () => {
    const service = new TestNotificationService();
    when(mockOnlineStatusService.isBrowserOnline).thenReturn(false);
    state = HubConnectionState.Reconnecting;

    await service.start();

    verify(mockHubConnection.stop()).never();
    verify(mockHubConnection.start()).never();
    expect(service.isConnected).toBe(false);
  });

  it('does not restart a connected connection', async () => {
    const service = new TestNotificationService();
    state = HubConnectionState.Connected;

    await service.start();

    verify(mockHubConnection.stop()).never();
    verify(mockHubConnection.start()).never();
  });

  it('reports when the connection is lost', () => {
    const service = new TestNotificationService();
    let lostCount = 0;
    service.connectionLost$.subscribe(() => lostCount++);
    const [onReconnecting] = capture(mockHubConnection.onreconnecting).last();
    const [onClose] = capture(mockHubConnection.onclose).last();

    onReconnecting();
    expect(lostCount).toBe(1);
    onClose();
    expect(lostCount).toBe(2);
  });

  it('subscribes to its projects again after reconnecting', async () => {
    const service = new TestNotificationService();
    state = HubConnectionState.Connected;
    await service.subscribeToProject('project01');
    const [onReconnected] = capture(mockHubConnection.onreconnected).last();

    onReconnected('new-connection-id');
    await Promise.resolve();

    verify(mockHubConnection.invoke('subscribeToProject', 'project01')).twice();
  });

  it('forgets its projects once stopped', async () => {
    const service = new TestNotificationService();
    await service.start();
    await service.subscribeToProject('project01');
    await service.stop();
    const [onReconnected] = capture(mockHubConnection.onreconnected).last();

    state = HubConnectionState.Connected;
    onReconnected('new-connection-id');
    await Promise.resolve();

    verify(mockHubConnection.invoke('subscribeToProject', 'project01')).once();
  });
});

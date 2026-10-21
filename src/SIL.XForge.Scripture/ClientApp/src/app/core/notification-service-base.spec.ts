import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { NotificationServiceBase } from './notification-service-base';

const mockedAuthService = mock(AuthService);
const mockedHubConnection = mock(HubConnection);

class TestNotificationService extends NotificationServiceBase {
  constructor(connection: HubConnection) {
    super(instance(mockedAuthService));
    this.connection = connection;
  }
}

describe('NotificationServiceBase', () => {
  let service: TestNotificationService;

  beforeEach(() => {
    resetCalls(mockedHubConnection);
    when(mockedHubConnection.state).thenReturn(HubConnectionState.Disconnected);
    when(mockedHubConnection.start()).thenResolve();
    when(mockedHubConnection.stop()).thenResolve();
    when(mockedHubConnection.invoke('subscribeToProject', anything())).thenResolve();
    spyOn(console, 'warn');
    service = new TestNotificationService(instance(mockedHubConnection));
  });

  it('does not throw when the connection cannot be started', async () => {
    when(mockedHubConnection.start()).thenReject(
      new Error("Failed to complete negotiation with the server: Error: Gateway Timeout: Status code '504'")
    );

    await expectAsync(service.start()).toBeResolved();
    expect(console.warn).toHaveBeenCalled();
  });

  it('tries to connect again after a failed start', async () => {
    when(mockedHubConnection.start()).thenReject(new Error('Unable to connect to the server'));
    await service.start();
    when(mockedHubConnection.start()).thenResolve();

    await service.start();

    verify(mockedHubConnection.start()).twice();
  });

  it('skips subscribing when the connection could not be started', async () => {
    when(mockedHubConnection.start()).thenReject(new Error('Unable to connect to the server'));
    await service.start();

    await expectAsync(service.subscribeToProject('project01')).toBeResolved();

    verify(mockedHubConnection.invoke('subscribeToProject', anything())).never();
  });

  it('does not throw when subscribing to a project fails', async () => {
    when(mockedHubConnection.state).thenReturn(HubConnectionState.Connected);
    when(mockedHubConnection.invoke('subscribeToProject', anything())).thenReject(
      new Error('Server timeout elapsed without receiving a message from the server.')
    );

    await expectAsync(service.subscribeToProject('project01')).toBeResolved();
    verify(mockedHubConnection.invoke('subscribeToProject', 'project01')).once();
    expect(console.warn).toHaveBeenCalled();
  });

  it('stops the connection when the last user stops it', async () => {
    await service.start();
    await service.start();

    await service.stop();
    verify(mockedHubConnection.stop()).never();
    await service.stop();
    verify(mockedHubConnection.stop()).once();
  });
});

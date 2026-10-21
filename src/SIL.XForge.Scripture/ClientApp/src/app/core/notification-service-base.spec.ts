import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { ErrorReportingService } from 'xforge-common/error-reporting.service';
import { NotificationServiceBase } from './notification-service-base';

const mockedAuthService = mock(AuthService);
const mockedErrorReportingService = mock(ErrorReportingService);
const mockedHubConnection = mock(HubConnection);

class TestNotificationService extends NotificationServiceBase {
  constructor(connection: HubConnection) {
    super(instance(mockedAuthService), instance(mockedErrorReportingService));
    this.connection = connection;
  }
}

describe('NotificationServiceBase', () => {
  let service: TestNotificationService;

  beforeEach(() => {
    resetCalls(mockedHubConnection);
    resetCalls(mockedErrorReportingService);
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

    expect(await service.subscribeToProject('project01')).toBe(false);

    verify(mockedHubConnection.invoke('subscribeToProject', anything())).never();
  });

  it('does not start or subscribe while SignalR is reconnecting', async () => {
    when(mockedHubConnection.state).thenReturn(HubConnectionState.Reconnecting);

    await service.start();
    expect(await service.subscribeToProject('project01')).toBe(false);

    verify(mockedHubConnection.start()).never();
    verify(mockedHubConnection.invoke('subscribeToProject', anything())).never();
  });

  it('reports that it subscribed to a project', async () => {
    when(mockedHubConnection.state).thenReturn(HubConnectionState.Connected);

    expect(await service.subscribeToProject('project01')).toBe(true);
    verify(mockedHubConnection.invoke('subscribeToProject', 'project01')).once();
  });

  it('does not throw or report when the connection closes while subscribing', async () => {
    when(mockedHubConnection.state).thenReturn(HubConnectionState.Connected);
    when(mockedHubConnection.invoke('subscribeToProject', anything())).thenReject(
      new Error('Invocation canceled due to the underlying connection being closed.')
    );

    expect(await service.subscribeToProject('project01')).toBe(false);
    expect(console.warn).toHaveBeenCalled();
    verify(mockedErrorReportingService.silentError(anything(), anything())).never();
  });

  it('silently reports when the server rejects the subscription', async () => {
    when(mockedHubConnection.state).thenReturn(HubConnectionState.Connected);
    when(mockedHubConnection.invoke('subscribeToProject', anything())).thenReject(
      new Error("An unexpected error occurred invoking 'subscribeToProject' on the server.")
    );

    expect(await service.subscribeToProject('project01')).toBe(false);
    verify(mockedErrorReportingService.silentError(anything(), anything())).once();
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

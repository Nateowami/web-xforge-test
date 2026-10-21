import { HubConnection, HubConnectionState, IHttpConnectionOptions } from '@microsoft/signalr';
import { AuthService } from 'xforge-common/auth.service';
import { ErrorReportingService } from 'xforge-common/error-reporting.service';

/**
 * The base class containing functionality for SignalR notification hubs.
 *
 * NOTE: You will need to build the connection in your constructor.
 */
export abstract class NotificationServiceBase {
  protected connection!: HubConnection;
  protected options: IHttpConnectionOptions = {
    accessTokenFactory: async () => (await this.authService.getAccessToken()) ?? ''
  };
  private openConnections: number = 0;
  private startPromise: Promise<void> | null = null;

  constructor(
    private authService: AuthService,
    private readonly errorReportingService: ErrorReportingService
  ) {}

  async start(): Promise<void> {
    this.openConnections++;
    // If a start is already in progress, wait for it to resolve
    if (this.startPromise != null) {
      await this.startPromise;
      return;
    }

    // Only start the connection if we are disconnected
    if (this.connection.state === HubConnectionState.Disconnected) {
      this.startPromise = (async (): Promise<void> => {
        try {
          await this.connection.start();
        } catch (err) {
          // SignalR only provides live progress updates, so a failure to connect (a dropped or flaky network, or a
          // firewall, proxy or VPN blocking the connection) must not interrupt the user. The features using it carry on
          // without live updates, and the connection is attempted again the next time start() is called.
          console.warn('Unable to connect to the SignalR notification hub', err);
        } finally {
          this.startPromise = null;
        }
      })();

      await this.startPromise;
    }

    // If already connected or connecting, we do not need to restart the connection
  }

  async stop(): Promise<void> {
    if (this.openConnections > 0 && this.openConnections-- === 1) {
      // If start() has not completed, wait for it to complete before stopping
      if (this.startPromise != null) {
        try {
          await this.startPromise;
        } catch {
          // Suppress errors from start() during stop() to ensure connection.stop() is called
        }
      }
      await this.connection.stop();
    }
  }

  /**
   * Subscribes to the notifications for a project.
   *
   * @param projectId The project identifier.
   * @returns true if notifications for the project will be received. If false, the connection could not be made, so
   * features waiting on a notification to finish must not rely on it.
   */
  async subscribeToProject(projectId: string): Promise<boolean> {
    // Wait until connection is fully started
    if (this.startPromise != null) {
      await this.startPromise;
    }

    if (this.connection.state !== HubConnectionState.Connected) {
      // If not connected (including while SignalR is reconnecting), skip the invocation
      return false;
    }

    try {
      await this.connection.invoke('subscribeToProject', projectId);
      return true;
    } catch (err: any) {
      if (
        this.connection.state !== HubConnectionState.Connected ||
        err?.message === "Cannot send data if the connection is not in the 'Connected' State." ||
        err?.message?.includes('Invocation canceled due to the underlying connection being closed')
      ) {
        // As with start(), the connection closing only means there will be no live updates
        console.warn('Unable to subscribe to SignalR notifications for the project', err);
      } else {
        // The server rejected the subscription, which is a bug rather than a connectivity problem
        this.errorReportingService.silentError(
          'Unable to subscribe to SignalR notifications for the project',
          ErrorReportingService.normalizeError(err)
        );
      }
      return false;
    }
  }
}

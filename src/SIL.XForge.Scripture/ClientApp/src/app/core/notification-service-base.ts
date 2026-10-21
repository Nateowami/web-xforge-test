import { HubConnection, HubConnectionState, IHttpConnectionOptions } from '@microsoft/signalr';
import { AuthService } from 'xforge-common/auth.service';

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

  constructor(private authService: AuthService) {}

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

  async subscribeToProject(projectId: string): Promise<void> {
    // Wait until connection is fully started
    if (this.startPromise != null) {
      await this.startPromise;
    }

    if (this.connection.state !== HubConnectionState.Connected) {
      // If not connected, skip the invocation
      return;
    }

    try {
      await this.connection.invoke('subscribeToProject', projectId);
    } catch (err) {
      // As with start(), a failure here (usually the connection closing) only means there will be no live updates
      console.warn('Unable to subscribe to SignalR notifications for the project', err);
    }
  }
}

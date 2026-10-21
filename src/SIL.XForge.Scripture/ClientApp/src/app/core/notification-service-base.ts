import { AbortError, HubConnection, HubConnectionState, IHttpConnectionOptions } from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { AuthService } from 'xforge-common/auth.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';

/**
 * The base class containing functionality for SignalR notification hubs.
 *
 * NOTE: You will need to build the connection in your constructor.
 */
export abstract class NotificationServiceBase {
  protected options: IHttpConnectionOptions = {
    accessTokenFactory: async () => (await this.authService.getAccessToken()) ?? ''
  };
  private openConnections: number = 0;
  private startPromise: Promise<void> | null = null;
  private _connection!: HubConnection;
  private readonly connectionLostSubject = new Subject<void>();
  /** The projects subscribed to since the connection was started, so that they can be resubscribed after a reconnect. */
  private readonly subscribedProjectIds = new Set<string>();

  constructor(
    private authService: AuthService,
    private readonly onlineService: OnlineStatusService
  ) {}

  protected get connection(): HubConnection {
    return this._connection;
  }

  protected set connection(connection: HubConnection) {
    this._connection = connection;
    connection.onreconnecting(() => this.connectionLostSubject.next());
    connection.onclose(() => this.connectionLostSubject.next());
    connection.onreconnected(() => void this.resubscribeToProjects());
  }

  /**
   * Emits when the connection drops or closes. Notifications sent until it is connected again are never received.
   */
  get connectionLost$(): Observable<void> {
    return this.connectionLostSubject.asObservable();
  }

  get appOnline(): boolean {
    return this.onlineService.isOnline && this.onlineService.isBrowserOnline;
  }

  get isConnected(): boolean {
    return this.connection.state === HubConnectionState.Connected;
  }

  async start(): Promise<void> {
    this.openConnections++;
    // If a start is already in progress, wait for it to resolve
    if (this.startPromise != null) {
      await this.startPromise;
      return;
    }

    // The connection is only in the Reconnecting state once any stateful reconnect has failed. Automatic reconnect can
    // then wait up to 30 seconds between attempts, so if we are online, restart it now so that the caller gets a usable
    // connection. If we are offline, leave automatic reconnect running, as a restart would fail and not be retried.
    let restarted = false;
    if (this.connection.state === HubConnectionState.Reconnecting && this.appOnline) {
      await this.connection.stop();
      restarted = true;
    }

    // Only start the connection if we are disconnected
    if (this.connection.state === HubConnectionState.Disconnected) {
      this.startPromise = (async (): Promise<void> => {
        try {
          await this.connection.start();
        } catch (err) {
          // Suppress AbortErrors, as they are not caused by server error, but the SignalR connection state
          // These will be thrown if a user navigates away quickly after
          // starting the sync or the app loses internet connection
          if (err instanceof AbortError || !this.appOnline) {
            return;
          } else {
            throw err;
          }
        } finally {
          this.startPromise = null;
        }
      })();

      await this.startPromise;
      if (restarted) await this.resubscribeToProjects();
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
      this.subscribedProjectIds.clear();
    }
  }

  async subscribeToProject(projectId: string): Promise<void> {
    this.subscribedProjectIds.add(projectId);

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
    } catch (err: any) {
      // Suppress errors caused by connection closing
      if (
        err.message === "Cannot send data if the connection is not in the 'Connected' State." ||
        err.message?.includes('Invocation canceled due to the underlying connection being closed')
      ) {
        return;
      } else {
        throw err;
      }
    }
  }

  /**
   * Subscribes to the projects again, as a connection that was reconnected or restarted has a new connection id, so it
   * is no longer in the projects' groups on the server.
   */
  private async resubscribeToProjects(): Promise<void> {
    for (const projectId of this.subscribedProjectIds) {
      try {
        await this.subscribeToProject(projectId);
      } catch (err) {
        // The user may no longer have access to a project they were subscribed to
        console.error(err);
      }
    }
  }
}

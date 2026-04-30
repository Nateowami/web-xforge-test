import ShareDB from 'sharedb';
import { ExceptionReporter } from './exception-reporter';
export declare class WebSocketStreamListener {
  private readonly audience;
  private readonly scope;
  private readonly port;
  private readonly origin;
  private exceptionReporter;
  private readonly httpServer;
  private readonly jwksClient;
  constructor(
    audience: string,
    scope: string,
    authority: string,
    port: number,
    certificatePath: string | undefined,
    privateKeyPath: string | undefined,
    origin: string[],
    exceptionReporter: ExceptionReporter
  );
  listen(backend: ShareDB): void;
  start(): Promise<void>;
  stop(): void;
  private verifyToken;
  private getKey;
  private verifyClient;
}

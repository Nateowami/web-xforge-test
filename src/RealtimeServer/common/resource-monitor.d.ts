import ShareDB, { Agent, PubSub } from 'sharedb';
import { Connection } from 'sharedb/lib/client';
import { Duplex } from 'stream';
import { ConnectSession } from './connect-session';
/**
 * Defines some fields on the ShareDB Connection type in connection.js, to be used for measuring purposes.
 */
export interface ConnectionInternal {
  id: string;
  collections: Record<
    string,
    Record<
      string,
      {
        data: any;
      }
    >
  >;
  queries: Record<
    string,
    {
      results: any;
    }
  >;
  _presences: Record<string, unknown>;
  _snapshotRequests: Record<string, unknown>;
  agent: Agent | null;
}
/**
 * Information about a connection for monitoring purposes
 */
export interface ConnectionInfo {
  timestamp: string;
  id: string;
  collectionsDocsCount: number;
  collectionsDocsBytes: number;
  queriesCount: number;
  queriesBytes: number;
  presencesCount: number;
  snapshotRequestsCount: number;
}
/**
 * Defines some fields on the ShareDB Agent type in agent.js, used for measuring purposes.
 */
export interface AgentInternal {
  src: string | null;
  clientId: string;
  connectTime: number;
  subscribedDocs: Record<string, Record<string, unknown>>;
  subscribedQueries: Record<
    string,
    {
      query: unknown | undefined;
      streams: unknown;
    }
  >;
  subscribedPresences: Record<string, unknown>;
  connectSession: ConnectSession | undefined;
}
/**
 * Information about a ShareDB Agent for monitoring purposes
 */
export interface AgentInfo {
  timestamp: string;
  src: string | null;
  clientId: string;
  connectTime: number;
  connectSessionUserId: string | undefined;
  subscribedDocsCount: number;
  subscribedDocsBytes: number;
  subscribedPresencesCount: number;
  subscribedPresencesBytes: number;
  subscribedQueriesCount: number;
  subscribedQueriesBytes: number;
}
/**
 * Defines some fields on the ShareDB PubSub type in pubsub/index.js, used for measuring purposes.
 */
export interface PubSubInternal {
  nextStreamId: number;
  streamsCount: number;
  streams: Record<string, Record<string, unknown>>;
  subscribed: Record<string, true>;
}
/**
 * Information about ShareDB PubSub for monitoring purposes
 */
export interface PubSubInfo {
  timestamp: string;
  nextStreamId: number;
  streamsCount: number;
  streamsBytes: number;
  subscribedCount: number;
  subscribedBytes: number;
}
/**
 * Monitors and reports on various memory usages. Reports on request, or optionally periodically.
 */
export declare class ResourceMonitor {
  private static _instance;
  /** How often to record resource usage. */
  private intervalMs;
  /** Agent objects being monitored. */
  private readonly agents;
  private readonly connections;
  private pubSub;
  private readonly heapInfoPath;
  private readonly connectionInfoPath;
  private readonly agentInfoPath;
  private readonly pubSubInfoPath;
  /** Singleton. */
  static get instance(): ResourceMonitor;
  private constructor();
  /** Begin periodic recording. */
  start(): void;
  startMonitoringConnection(connection: Connection): void;
  stopMonitoringConnection(connection: Connection): void;
  monitorAgent(agent: ShareDB.Agent, stream: Duplex): void;
  stopMonitoringAgentOnConnection(connection: Connection): void;
  setPubSub(pubSub: PubSub): void;
  /** Record current resource usage. */
  record(): Promise<void>;
  private recordConnectionDiagnostics;
  private recordAgentDiagnostics;
  private recordPubSubDiagnostics;
  private reportOnConnection;
  private reportOnAgent;
  private reportOnPubSub;
  private recordHeapUsage;
  /** Write data to a CSV file. If needed, create header row from the data's objects' keys. */
  private saveToCsv;
  private getOutputDir;
  private isStringPopulated;
}

/**
 * Proof of Concept: ShareDB Projection Op Security
 *
 * This test demonstrates whether ShareDB projections properly sanitize ops
 * before sending them to subscribed clients. Specifically, it tests:
 *
 * 1. Whether ops modifying non-projected fields are visible to projection subscribers
 * 2. Whether old values (od) of projected fields are visible to subscribers
 * 3. Whether a late subscriber (version 0) receives historical ops with non-projected data
 */
import { instance, mock } from 'ts-mockito';
import ShareDB from 'sharedb';
import ShareDBMingo from 'sharedb-mingo-memory';
import * as OTJson0 from 'ot-json0';
import { SystemRole } from '../models/system-role';
import { User, USER_PROFILES_COLLECTION, USERS_COLLECTION } from '../models/user';
import { createTestUser } from '../models/user-test-data';
import { RealtimeServer } from '../realtime-server';
import { SchemaVersionRepository } from '../schema-version-repository';
import { allowAll, clientConnect, createDoc, flushPromises } from '../utils/test-utils';
import { UserService } from './user-service';

describe('Projection Op Security PoC', () => {
  /**
   * Test 1: Verify that ops on non-projected fields (e.g., email, authId)
   * are NOT sent to clients subscribed to the projection collection.
   */
  it('should NOT send ops for non-projected fields to projection subscribers', async () => {
    const env = new TestEnvironment();
    await env.createData();

    // Subscribe to user_profiles projection (only displayName, avatarUrl)
    const subscriberConn = clientConnect(env.server, 'user02', SystemRole.User);
    const profileDoc = subscriberConn.get(USER_PROFILES_COLLECTION, 'user01');

    const receivedOps: any[] = [];
    await new Promise<void>((resolve, reject) => {
      profileDoc.subscribe(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    profileDoc.on('op', (op: any) => {
      receivedOps.push(op);
    });

    // Now modify a NON-projected field (email) on the source collection
    const serverConn = env.server.connect();
    const userDoc = serverConn.get(USERS_COLLECTION, 'user01');
    await new Promise<void>((resolve, reject) => {
      userDoc.fetch(err => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      userDoc.submitOp([{ p: ['email'], od: 'user1@example.com', oi: 'newemail@example.com' }], {}, err =>
        err ? reject(err) : resolve()
      );
    });

    await flushPromises();

    // RESULT: Check if the projection subscriber received the op for email
    console.log('Test 1 - Ops received by projection subscriber for non-projected field change:');
    console.log(JSON.stringify(receivedOps, null, 2));
    console.log(`Number of ops received: ${receivedOps.length}`);

    // FINDING: ShareDB DOES send an op to the projection subscriber, but the op
    // components array is empty (the non-projected field components are stripped).
    // An empty op [] is still sent though.
    // The actual data (email value) is NOT leaked - the op components are stripped.
    if (receivedOps.length > 0) {
      // The op is received but should have empty components
      expect(receivedOps[0]).toEqual([]);
      console.log('FINDING: Empty op received (no data leaked, but op event still fires)');
    }
  });

  /**
   * Test 2: Verify that when a projected field IS modified, the old value (od)
   * is still visible to projection subscribers.
   */
  it('should show old values (od) when projected fields change', async () => {
    const env = new TestEnvironment();
    await env.createData();

    // Subscribe to user_profiles projection
    const subscriberConn = clientConnect(env.server, 'user02', SystemRole.User);
    const profileDoc = subscriberConn.get(USER_PROFILES_COLLECTION, 'user01');

    const receivedOps: any[] = [];
    await new Promise<void>((resolve, reject) => {
      profileDoc.subscribe(err => (err ? reject(err) : resolve()));
    });

    profileDoc.on('op', (op: any) => {
      receivedOps.push(op);
    });

    // Modify a PROJECTED field (displayName) - this simulates changing from real name to pseudonym
    const serverConn = env.server.connect();
    const userDoc = serverConn.get(USERS_COLLECTION, 'user01');
    await new Promise<void>((resolve, reject) => {
      userDoc.fetch(err => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      userDoc.submitOp([{ p: ['displayName'], od: 'Test user 1', oi: 'MyPseudonym' }], {}, err =>
        err ? reject(err) : resolve()
      );
    });

    await flushPromises();

    console.log('Test 2 - Ops received for projected field change (displayName):');
    console.log(JSON.stringify(receivedOps, null, 2));

    // This WILL receive the op because displayName is a projected field.
    // The question is: does it include 'od' (the old value)?
    expect(receivedOps.length).toBe(1);

    const receivedOp = receivedOps[0];
    console.log(`Contains od (old value "Test user 1"): ${JSON.stringify(receivedOp)}`);

    // ShareDB WILL include od for projected fields - this is the security concern
    // The old value 'Test user 1' (the real name) would be visible
    expect(receivedOp).toContainEqual(
      expect.objectContaining({ p: ['displayName'], oi: 'MyPseudonym', od: 'Test user 1' })
    );
  });

  /**
   * Test 3: THE CRITICAL ATTACK SCENARIO (end-to-end)
   * A subscriber that already has the doc at v1 reconnects. ShareDB sends ops from v1 onwards
   * which include historical values of projected fields.
   */
  it('should leak old displayName values when ops are replayed to a reconnecting subscriber', async () => {
    const env = new TestEnvironment();
    await env.createData();

    // Step 1: Attacker subscribes early (gets current state at version 1)
    const attackerConn = clientConnect(env.server, 'user02', SystemRole.User);
    const attackerDoc = attackerConn.get(USER_PROFILES_COLLECTION, 'user01');

    const allReceivedOps: any[] = [];
    await new Promise<void>((resolve, reject) => {
      attackerDoc.subscribe(err => (err ? reject(err) : resolve()));
    });

    attackerDoc.on('op', (op: any) => {
      allReceivedOps.push(JSON.parse(JSON.stringify(op)));
    });

    // Current state: displayName = 'Test user 1' (real name from OAuth)
    expect(attackerDoc.data.displayName).toBe('Test user 1');
    expect(attackerDoc.version).toBe(1);

    // Step 2: User changes displayName to pseudonym
    const serverConn = env.server.connect();
    const userDoc = serverConn.get(USERS_COLLECTION, 'user01');
    await new Promise<void>((resolve, reject) => {
      userDoc.fetch(err => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      userDoc.submitOp([{ p: ['displayName'], od: 'Test user 1', oi: 'MyPseudonym' }], {}, err =>
        err ? reject(err) : resolve()
      );
    });

    await flushPromises();

    // Step 3: Attacker receives the op with BOTH old and new values
    console.log('\n=== ATTACK SCENARIO RESULT ===');
    console.log('Ops received by attacker:');
    console.log(JSON.stringify(allReceivedOps, null, 2));

    expect(allReceivedOps.length).toBe(1);
    const leakedOp = allReceivedOps[0];

    // SECURITY ISSUE: The attacker can see the old displayName (real name)
    // even though the user changed it to a pseudonym
    const displayNameComponent = leakedOp.find((c: any) => c.p[0] === 'displayName');
    expect(displayNameComponent.od).toBe('Test user 1'); // LEAKED: real name visible
    expect(displayNameComponent.oi).toBe('MyPseudonym');

    console.log(`LEAKED old value (real name): "${displayNameComponent.od}"`);
    console.log(`New value (pseudonym): "${displayNameComponent.oi}"`);
    console.log('=== END ATTACK SCENARIO ===\n');
  });

  /**
   * Test 3b: THE FIX - Verify that reconnecting subscribers to projection collections
   * receive a snapshot replacement op instead of historical ops, preventing data leaks.
   */
  it('should NOT leak old values when a client reconnects to a projection (fix verification)', async () => {
    const env = new TestEnvironment();
    await env.createData();

    // Step 1: User changes displayName from real name to pseudonym
    const serverConn = env.server.connect();
    const userDoc = serverConn.get(USERS_COLLECTION, 'user01');
    await new Promise<void>((resolve, reject) => {
      userDoc.fetch(err => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      userDoc.submitOp([{ p: ['displayName'], od: 'Test user 1', oi: 'MyPseudonym' }], {}, err =>
        err ? reject(err) : resolve()
      );
    });

    await flushPromises();

    // Step 2: Simulate reconnection scenario - subscribe with version 1 (client had old version)
    const attackerConn = clientConnect(env.server, 'user02', SystemRole.User);
    const attackerDoc = attackerConn.get(USER_PROFILES_COLLECTION, 'user01');

    // Manually set version to 1 to simulate a reconnecting client at version 1
    (attackerDoc as any).version = 1;
    (attackerDoc as any).type = OTJson0.type;
    (attackerDoc as any).data = { displayName: 'Test user 1', avatarUrl: 'https://cdn.auth0.com/avatars/1.png' };

    const receivedOps: any[] = [];
    attackerDoc.on('op', (op: any) => {
      receivedOps.push(JSON.parse(JSON.stringify(op)));
    });

    // Subscribe - this should trigger the projection subscribe interceptor
    await new Promise<void>((resolve, reject) => {
      attackerDoc.subscribe(err => (err ? reject(err) : resolve()));
    });

    await flushPromises();

    console.log('\n=== FIX VERIFICATION ===');
    console.log('Document version after reconnection:', attackerDoc.version);
    console.log('Document data:', JSON.stringify(attackerDoc.data, null, 2));
    console.log('Ops received during reconnection:', JSON.stringify(receivedOps, null, 2));

    // CRITICAL: After reconnection, the document should be at the current version
    // with current data and NO leaked historical values
    expect(attackerDoc.version).toBe(2);
    expect(attackerDoc.data.displayName).toBe('MyPseudonym');

    // Verify that none of the received ops contain the old displayName
    for (const op of receivedOps) {
      for (const component of op) {
        if (component.od !== undefined) {
          // No od should contain the old name
          expect(component.od).not.toBe('Test user 1');
        }
        if (component.oi !== undefined && component.p?.[0] === 'displayName') {
          // The only oi for displayName should be the current pseudonym
          expect(component.oi).toBe('MyPseudonym');
        }
      }
    }
    console.log('=== FIX VERIFIED: No historical values leaked ===\n');
  });

  /**
   * Test 4: Verify projection behavior on raw ops
   * Directly examines how projectOp transforms historical ops.
   */
  it('should replay historical ops (including old values) to late subscribers', async () => {
    const env = new TestEnvironment();
    await env.createData();

    // Step 1: User sets displayName (simulating initial account creation with real name)
    // The createData already set displayName to 'Test user 1'

    // Step 2: User changes to pseudonym (this creates an op with od='Test user 1')
    const serverConn = env.server.connect();
    const userDoc = serverConn.get(USERS_COLLECTION, 'user01');
    await new Promise<void>((resolve, reject) => {
      userDoc.fetch(err => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      userDoc.submitOp([{ p: ['displayName'], od: 'Test user 1', oi: 'MyPseudonym' }], {}, err =>
        err ? reject(err) : resolve()
      );
    });

    // Step 3: Also modify a non-projected field to see if it leaks in replay
    await new Promise<void>((resolve, reject) => {
      userDoc.submitOp([{ p: ['email'], od: 'user1@example.com', oi: 'secret@example.com' }], {}, err =>
        err ? reject(err) : resolve()
      );
    });

    await flushPromises();

    // Step 4: "Attacker" subscribes to user_profiles with version 0
    // This simulates a client claiming to be at version 0 to get all ops replayed
    const attackerConn = clientConnect(env.server, 'user02', SystemRole.User);
    const attackerDoc = attackerConn.get(USER_PROFILES_COLLECTION, 'user01');

    // Subscribe and listen for ops
    await new Promise<void>((resolve, reject) => {
      attackerDoc.subscribe(err => (err ? reject(err) : resolve()));
    });

    // The document should now have the current projected snapshot
    console.log('Test 3 - Attacker snapshot after subscribe:');
    console.log(JSON.stringify(attackerDoc.data, null, 2));
    console.log(`Document version: ${attackerDoc.version}`);

    // Now simulate the attacker "going offline" and coming back at version 1
    // by directly fetching ops from version 0 onwards
    const ops = await new Promise<any[]>((resolve, reject) => {
      env.db.getOps(USERS_COLLECTION, 'user01', 0, null, {}, (err: any, ops: any[]) => {
        if (err) reject(err);
        else resolve(ops);
      });
    });

    console.log('Test 3 - All raw ops stored for user01:');
    for (const op of ops) {
      console.log(JSON.stringify(op.op || op.create, null, 2));
    }

    // Check what the projection's sanitizeOp would do to these ops
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const projections = require('sharedb/lib/projections');
    const USER_PROFILE_FIELDS = { displayName: true, avatarUrl: true };

    console.log('\nTest 3 - Ops after projection sanitization:');
    for (const op of ops) {
      const copy = JSON.parse(JSON.stringify(op));
      projections.projectOp(USER_PROFILE_FIELDS, copy);
      console.log(JSON.stringify(copy.op || copy.create, null, 2));
    }

    // KEY FINDINGS:
    // 1. Non-projected field ops (email) should be filtered out (empty op array)
    // 2. Projected field ops (displayName) will STILL contain od (old value)
    // 3. The create op will be projected to only include projected fields

    // Verify non-projected fields are stripped from create op
    const createOpCopy = JSON.parse(JSON.stringify(ops[0]));
    projections.projectOp(USER_PROFILE_FIELDS, createOpCopy);
    if (createOpCopy.create) {
      expect(createOpCopy.create.data).not.toHaveProperty('email');
      expect(createOpCopy.create.data).not.toHaveProperty('authId');
      expect(createOpCopy.create.data).toHaveProperty('displayName');
    }

    // Verify the displayName change op STILL contains od (the security leak)
    const displayNameOp = ops.find(
      (op: any) => op.op && op.op.some((c: any) => c.p && c.p[0] === 'displayName')
    );
    if (displayNameOp) {
      const opCopy = JSON.parse(JSON.stringify(displayNameOp));
      projections.projectOp(USER_PROFILE_FIELDS, opCopy);
      const component = opCopy.op.find((c: any) => c.p[0] === 'displayName');
      console.log('\nCRITICAL FINDING - displayName op after projection:');
      console.log(JSON.stringify(component, null, 2));

      // This assertion demonstrates the security issue:
      // Even after projection, od (old value) is STILL present
      expect(component.od).toBe('Test user 1');
      expect(component.oi).toBe('MyPseudonym');
    }

    // Verify email op is completely stripped
    const emailOp = ops.find((op: any) => op.op && op.op.some((c: any) => c.p && c.p[0] === 'email'));
    if (emailOp) {
      const opCopy = JSON.parse(JSON.stringify(emailOp));
      projections.projectOp(USER_PROFILE_FIELDS, opCopy);
      console.log('\nEmail op after projection (should be empty):');
      console.log(JSON.stringify(opCopy.op, null, 2));
      expect(opCopy.op.length).toBe(0);
    }
  });
});

class TestEnvironment {
  readonly service: UserService;
  readonly server: RealtimeServer;
  readonly db: ShareDBMingo;
  readonly mockedSchemaVersionRepository = mock(SchemaVersionRepository);

  constructor() {
    this.service = new UserService();
    const ShareDBMingoType = ShareDBMingo.extendMemoryDB(ShareDB.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new RealtimeServer(
      'TEST',
      false,
      false,
      [this.service],
      'projects',
      this.db,
      instance(this.mockedSchemaVersionRepository)
    );
    // Allow all access for testing - we're testing projection behavior, not access control
    allowAll(this.server, USERS_COLLECTION);
    allowAll(this.server, USER_PROFILES_COLLECTION);
  }

  async createData(): Promise<void> {
    const conn = this.server.connect();
    await createDoc<User>(conn, USERS_COLLECTION, 'user01', createTestUser({}, 1));
    await createDoc<User>(conn, USERS_COLLECTION, 'user02', createTestUser({}, 2));
  }
}

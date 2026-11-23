/** Real JWT + Nest HTTP guards + isolated PostgreSQL revocation integration.
 * Never loads application .env or production bootstrap. Only a loopback database
 * named security_auth_test is accepted, and all rows are synthetic fixtures.
 */
import 'reflect-metadata';
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';
import { MessagesGateway } from '../messages/messages.gateway';
import { assertSessionActive } from './session-validation';
import { MessagesService } from '../messages/messages.service';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { bindSocketSession } from '../../../web/lib/socket-session';

const request = require('supertest');
const postgres = require('postgres');
const FIXTURE_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const CONVERSATION_ID = '33333333-3333-4333-8333-333333333333';
const TEST_SECRET = 'isolated-security-fixture-key-never-used-in-production-20261115';

@Controller()
class FixtureController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() b: any) { return this.auth.login(b.login, b.password); }
  @Post('refresh') refresh(@Body() b: any) { return this.auth.refreshTokens(b.refreshToken); }
  @Post('recover') recover(@Body() b: any) { return this.auth.recover(b.login, b.code, b.password); }
  @Post('logout-all') @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) { await this.auth.logoutAllDevices(req.user.userId); return { ok: true }; }
  @Get('protected') @UseGuards(JwtAuthGuard)
  protected(@Req() req: any) { return req.user; }
  @Get('optional') @UseGuards(OptionalJwtAuthGuard)
  optional(@Req() req: any) { return { authenticated: Boolean(req.user) }; }
}

describe('session security with isolated database', () => {
  let sql: any;
  let app: any;
  let db: any;
  let auth: AuthService;
  let gateway: MessagesGateway;
  const jwt = new JwtService();
  const config = { getOrThrow: () => TEST_SECRET } as unknown as ConfigService;

  async function row() {
    const [r] = await sql`select * from users where id=${FIXTURE_ID}`;
    return r && { id: r.id, login: 'security-fixture', role: 'client', status: r.status,
      email: null, subscriptionTier: 'none', tokensValidAfter: r.tokens_valid_after
        ? new Date(String(r.tokens_valid_after).replace(' ', 'T') + 'Z') : null,
      passwordHash: r.password_hash, recoveryCodeHash: r.recovery_code_hash };
  }
  async function login(password = 'fixture-password') {
    const res = await request(app.getHttpServer()).post('/login').send({ login: 'security-fixture', password });
    expect(res.status).toBe(201);
    return res.body;
  }
  async function refresh(token: string, status = 201) {
    const res = await request(app.getHttpServer()).post('/refresh').send({ refreshToken: token });
    expect(res.status).toBe(status);
    return res.body;
  }
  function socket(token: string): any {
    return { handshake: { auth: { token } }, disconnect: jest.fn(), join: jest.fn(), leave: jest.fn(), emit: jest.fn() };
  }

  beforeAll(async () => {
    const raw = process.env.SECURITY_TEST_DATABASE_URL;
    if (!raw) throw new Error('SECURITY_TEST_DATABASE_URL is required; never use application .env');
    const target = new URL(raw);
    if (target.hostname !== '127.0.0.1' || target.pathname !== '/security_auth_test') {
      throw new Error('Only isolated loopback security_auth_test database is permitted');
    }
    sql = postgres(raw, { max: 1 });
    await sql`create table users (
      id uuid primary key, status text not null, tokens_valid_after timestamp,
      password_hash text, recovery_code_hash text, last_login timestamp, updated_at timestamp
    )`;
    await sql`create table conversations (id uuid primary key)`;
    await sql`create table conversation_participants (
      id uuid primary key default gen_random_uuid(), conversation_id uuid references conversations(id),
      user_id uuid references users(id), last_read_at timestamp, created_at timestamp not null default now()
    )`;
    db = drizzle(sql);
    const realUsers = new UsersService(db);
    const fixtures = {
      findById: async (id: string) => id === FIXTURE_ID ? row() : null,
      findByLogin: async (name: string) => name === 'security-fixture' ? row() : null,
      validatePassword: (u: any, password: string) => bcrypt.compare(password, u.passwordHash),
      updateLastLogin: async () => undefined,
      updateTokensValidAfter: (id: string) => realUsers.updateTokensValidAfter(id),
      verifyRecoveryCode: (u: any, code: string) => bcrypt.compare(code, u.recoveryCodeHash),
      updatePassword: async (_id: string, password: string) => {
        const hash = await bcrypt.hash(password, 4);
        await sql`update users set password_hash=${hash} where id=${FIXTURE_ID}`;
      },
      setRecoveryCode: (id: string) => realUsers.setRecoveryCode(id),
    };
    auth = new AuthService(fixtures as any, {} as any, {} as any, jwt, config);
    const module = await Test.createTestingModule({ controllers: [FixtureController], providers: [
      { provide: AuthService, useValue: auth }, { provide: JwtService, useValue: jwt },
      { provide: ConfigService, useValue: config }, { provide: 'DRIZZLE', useValue: db },
      JwtAuthGuard, OptionalJwtAuthGuard,
      MessagesGateway,
      { provide: MessagesService, useValue: new MessagesService(db, {} as any, {} as any, config, {} as any, {} as any) },
    ] }).compile();
    gateway = module.get(MessagesGateway);
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    await sql`delete from conversation_participants`; await sql`delete from conversations`; await sql`delete from users`;
    const password = await bcrypt.hash('fixture-password', 4);
    const recovery = await bcrypt.hash('fixture-recovery-code', 4);
    await sql`insert into users(id,status,password_hash,recovery_code_hash)
      values(${FIXTURE_ID},'active',${password},${recovery})`;
    await sql`insert into users(id,status) values(${OTHER_ID},'active')`;
  });
  afterAll(async () => { jest.restoreAllMocks(); await app?.close(); await sql?.end(); });

  it('normal login and refresh preserve roles and issue working access tokens', async () => {
    const tokens = await login();
    expect(tokens.user.role).toBe('client');
    const fresh = await refresh(tokens.refreshToken);
    await request(app.getHttpServer()).get('/protected').auth(fresh.accessToken, { type: 'bearer' }).expect(200);
    expect((jwt.decode(fresh.accessToken) as any).type).toBe('access');
  });

  it('refresh is rejected as access by mandatory HTTP and Socket.IO auth, optional remains guest', async () => {
    const tokens = await login();
    await request(app.getHttpServer()).get('/protected').auth(tokens.refreshToken, { type: 'bearer' }).expect(401);
    const guest = await request(app.getHttpServer()).get('/optional').auth(tokens.refreshToken, { type: 'bearer' }).expect(200);
    expect(guest.body.authenticated).toBe(false);
    const socket = { handshake: { auth: { token: tokens.refreshToken } }, disconnect: jest.fn(), join: jest.fn() };
    await gateway.handleConnection(socket as any);
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(await auth.validateToken(tokens.refreshToken)).toBeNull();
  });

  it('logout-all revokes old refresh/access, fresh login works in the same JWT second', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.now());
    const old = await login();
    const existing = socket(old.accessToken);
    await gateway.handleConnection(existing);
    expect(existing.join).toHaveBeenCalledWith(`user:${FIXTURE_ID}`);
    await request(app.getHttpServer()).post('/logout-all').auth(old.accessToken, { type: 'bearer' }).expect(201);
    expect(existing.disconnect).toHaveBeenCalled();
    expect(existing.userId).toBeUndefined();
    expect(await gateway.handleJoin(existing, { conversationId: 'synthetic-only' })).toEqual({ error: 'Unauthorized' });
    await refresh(old.refreshToken, 401);
    await request(app.getHttpServer()).get('/protected').auth(old.accessToken, { type: 'bearer' }).expect(401);
    const fresh = await login();
    expect((jwt.decode(old.accessToken) as any).iat).toBe((jwt.decode(fresh.accessToken) as any).iat);
    expect((jwt.decode(old.accessToken) as any).sessionStamp).not.toBe((jwt.decode(fresh.accessToken) as any).sessionStamp);
    await refresh(fresh.refreshToken);
    await request(app.getHttpServer()).get('/protected').auth(fresh.accessToken, { type: 'bearer' }).expect(200);
    expect(await auth.validateToken(old.accessToken)).toBeNull();
  });

  it('recovery revokes old refresh and returns usable new access/refresh in the same second', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.now());
    const old = await login();
    const existing = socket(old.accessToken);
    await gateway.handleConnection(existing);
    const recovered = await request(app.getHttpServer()).post('/recover').send({
      login: 'security-fixture', code: 'fixture-recovery-code', password: 'new-fixture-password',
    }).expect(201);
    expect(existing.disconnect).toHaveBeenCalled();
    expect(existing.userId).toBeUndefined();
    expect(await gateway.handleJoin(existing, { conversationId: 'synthetic-only' })).toEqual({ error: 'Unauthorized' });
    await refresh(old.refreshToken, 401);
    await refresh(recovered.body.refreshToken);
    await request(app.getHttpServer()).get('/protected').auth(recovered.body.accessToken, { type: 'bearer' }).expect(200);
    const fresh = await login('new-fixture-password');
    expect((jwt.decode(old.accessToken) as any).iat).toBe((jwt.decode(fresh.accessToken) as any).iat);
    const invalid = await request(app.getHttpServer()).post('/login').send({ login: 'security-fixture', password: 'fixture-password' });
    expect(invalid.status).toBe(401);
  });

  it('two revocations are monotonic even when the stored stamp is ahead of wall clock', async () => {
    await sql`update users set tokens_valid_after=date_trunc('milliseconds', clock_timestamp() at time zone 'UTC')+interval '1 minute'`;
    const a = (await row()).tokensValidAfter.getTime();
    await auth.logoutAllDevices(FIXTURE_ID);
    const b = (await row()).tokensValidAfter.getTime();
    await auth.logoutAllDevices(FIXTURE_ID);
    const c = (await row()).tokensValidAfter.getTime();
    expect(b).toBe(a + 1); expect(c).toBe(b + 1);
  });

  it('legacy tokens in the revoked second fail closed; post-boundary legacy tokens remain compatible', () => {
    const stamp = new Date('2026-11-15T10:20:30.123Z');
    expect(() => assertSessionActive({ iat: Math.floor(stamp.getTime()/1000) }, { status: 'active', tokensValidAfter: stamp })).toThrow();
    expect(() => assertSessionActive({ iat: Math.floor(stamp.getTime()/1000) + 1 }, { status: 'active', tokensValidAfter: stamp })).not.toThrow();
    expect(() => assertSessionActive({ iat: 1 }, { status: 'active', tokensValidAfter: null })).not.toThrow();
  });

  it('blocked account cannot refresh', async () => {
    const tokens = await login();
    await sql`update users set status='suspended'`;
    await refresh(tokens.refreshToken, 401);
  });

  it('disconnects an existing socket when its real access JWT expires', async () => {
    const token = jwt.sign({ sub: FIXTURE_ID, role: 'client', type: 'access', sessionStamp: 0 }, {
      secret: TEST_SECRET, algorithm: 'HS256', issuer: 'lovnge-api', audience: 'lovnge-client', expiresIn: '1s',
    });
    const existing = socket(token);
    await gateway.handleConnection(existing);
    expect(existing.join).toHaveBeenCalled();
    expect(existing.disconnect).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(existing.disconnect).toHaveBeenCalled();
    expect(existing.userId).toBeUndefined();
  });

  it('does not join rooms if revocation occurs while the handshake DB check is pending', async () => {
    const tokens = await login();
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const delayedDb = { select: () => ({ from: () => ({ where: () => ({
      limit: async () => { await waiting; return [{ status: 'active', tokensValidAfter: null }]; },
    }) }) }) };
    const pendingGateway = new MessagesGateway({} as any, jwt, config, delayedDb);
    pendingGateway.onModuleInit();
    try {
      const existing = socket(tokens.accessToken);
      const connecting = pendingGateway.handleConnection(existing);
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(existing.userId).toBeUndefined();
      await auth.logoutAllDevices(FIXTURE_ID);
      release();
      await connecting;
      expect(existing.disconnect).toHaveBeenCalled();
      expect(existing.join).not.toHaveBeenCalled();
    } finally { release(); pendingGateway.onModuleDestroy(); }
  });

  async function eventually(check: () => boolean, timeout = 3500) {
    const deadline = Date.now() + timeout;
    while (!check()) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for isolated socket fixture');
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }

  it('real WebSocket client refreshes an expired session once and reconnects with a valid access JWT', async () => {
    const pair = await login();
    let access = jwt.sign({ sub: FIXTURE_ID, role: 'client', type: 'access', sessionStamp: 0 }, {
      secret: TEST_SECRET, algorithm: 'HS256', issuer: 'lovnge-api', audience: 'lovnge-client', expiresIn: '2s',
    });
    let ready = 0; let refreshCalls = 0; let denied = 0;
    const client = io((await app.getUrl()) + '/messages', { autoConnect: false,
      transports: ['websocket'], reconnection: false, auth: { token: access } });
    const dispose = bindSocketSession(client, {
      getToken: () => access,
      refresh: async () => {
        refreshCalls++;
        const r = await request(app.getHttpServer()).post('/refresh').send({ refreshToken: pair.refreshToken });
        if (r.status !== 201) return false;
        access = r.body.accessToken; return true;
      },
      onUnauthorized: () => { denied++; }, onReady: () => { ready++; },
    });
    try {
      client.connect();
      await eventually(() => ready === 1);
      const oldId = client.id;
      await eventually(() => ready === 2);
      expect(refreshCalls).toBe(1); expect(denied).toBe(0);
      expect(client.connected).toBe(true); expect(client.id).not.toBe(oldId);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(refreshCalls).toBe(1);
    } finally { dispose(); client.disconnect(); }
  });

  it('real WebSocket client stops and clears its session after revoked refresh, without retry loop', async () => {
    const pair = await login(); let access: string | null = pair.accessToken;
    let ready = 0; let refreshCalls = 0; let denied = 0;
    const client = io((await app.getUrl()) + '/messages', { autoConnect: false,
      transports: ['websocket'], reconnection: false, auth: { token: access } });
    const dispose = bindSocketSession(client, {
      getToken: () => access,
      refresh: async () => {
        refreshCalls++;
        const r = await request(app.getHttpServer()).post('/refresh').send({ refreshToken: pair.refreshToken });
        return r.status === 201;
      },
      onUnauthorized: () => { access = null; denied++; }, onReady: () => { ready++; },
    });
    try {
      client.connect(); await eventually(() => ready === 1);
      await auth.logoutAllDevices(FIXTURE_ID);
      await eventually(() => denied === 1);
      expect(access).toBeNull(); expect(client.connected).toBe(false);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(refreshCalls).toBe(1); expect(denied).toBe(1);
    } finally { dispose(); client.disconnect(); }
  });

  it('real sockets deny foreign conversation join/read/send and do not receive its broadcast', async () => {
    await sql`insert into conversations(id) values(${CONVERSATION_ID})`;
    await sql`insert into conversation_participants(conversation_id,user_id) values(${CONVERSATION_ID},${OTHER_ID})`;
    const pair = await login();
    const ownerToken = jwt.sign({ sub: OTHER_ID, role: 'client', type: 'access', sessionStamp: 0 }, {
      secret: TEST_SECRET, algorithm: 'HS256', issuer: 'lovnge-api', audience: 'lovnge-client', expiresIn: '1h',
    });
    const sockets: ClientSocket[] = [];
    async function connected(token: string) {
      const client = io((await app.getUrl()) + '/messages', { autoConnect: false,
        transports: ['websocket'], reconnection: false, auth: { token } });
      sockets.push(client);
      const ready = new Promise<void>(resolve => client.once('session_ready', resolve));
      client.connect(); await ready; return client;
    }
    const ack = (client: ClientSocket, event: string, body: any) =>
      new Promise<any>(resolve => client.emit(event, body, resolve));
    try {
      const foreign = await connected(pair.accessToken);
      const owner = await connected(ownerToken);
      const foreignMessages = jest.fn(); const ownerMessages = jest.fn();
      foreign.on('new_message', foreignMessages); owner.on('new_message', ownerMessages);
      expect(await ack(foreign, 'join_conversation', { conversationId: CONVERSATION_ID })).toEqual({ error: 'Forbidden' });
      expect(await ack(foreign, 'mark_read', { conversationId: CONVERSATION_ID })).toEqual({ error: 'Forbidden' });
      expect((await ack(foreign, 'send_message', { conversationId: CONVERSATION_ID, content: 'synthetic-only' })).error).toBeTruthy();
      expect(await ack(owner, 'join_conversation', { conversationId: CONVERSATION_ID })).toEqual({ ok: true });
      gateway.server.to(`conv:${CONVERSATION_ID}`).emit('new_message', { content: 'synthetic broadcast' });
      await eventually(() => ownerMessages.mock.calls.length === 1);
      expect(foreignMessages).not.toHaveBeenCalled();
    } finally { for (const client of sockets) client.disconnect(); }
  });

  it.each(['issuer', 'audience', 'algorithm'])('rejects incorrect %s on refresh verification', async (wrong) => {
    const options: any = { secret: TEST_SECRET, algorithm: 'HS256', issuer: 'lovnge-api', audience: 'lovnge-client', expiresIn: '1h' };
    options[wrong] = wrong === 'algorithm' ? 'HS384' : 'other-app';
    const token = jwt.sign({ sub: FIXTURE_ID, role: 'client', type: 'refresh', sessionStamp: 0 }, options);
    await refresh(token, 401);
  });
});

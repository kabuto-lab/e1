import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { Inject, Logger, UnauthorizedException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@escort/db';
import { assertSessionActive } from '../auth/session-validation';
import { subscribeSessionRevoked } from '../auth/session-revocation';

interface AuthSocket extends Socket {
  userId?: string;
  role?: string;
  sessionUserId?: string;
  accessExpiresAt?: number;
  expiryTimer?: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);
  private readonly activeSockets = new Map<string, Set<AuthSocket>>();
  private unsubscribeRevocations?: () => void;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  onModuleInit() {
    this.unsubscribeRevocations = subscribeSessionRevoked((userId) => {
      for (const client of this.activeSockets.get(userId) ?? []) this.disconnect(client);
    });
  }

  onModuleDestroy() {
    this.unsubscribeRevocations?.();
    for (const sockets of this.activeSockets.values()) {
      for (const client of sockets) this.disconnect(client);
    }
  }

  private forget(client: AuthSocket) {
    if (client.expiryTimer) clearTimeout(client.expiryTimer);
    const userId = client.sessionUserId;
    if (userId) {
      const sockets = this.activeSockets.get(userId);
      sockets?.delete(client);
      if (!sockets?.size) this.activeSockets.delete(userId);
    }
    client.userId = undefined;
    client.role = undefined;
    client.sessionUserId = undefined;
    client.accessExpiresAt = undefined;
    client.expiryTimer = undefined;
  }

  private disconnect(client: AuthSocket) {
    this.forget(client);
    client.disconnect(true);
  }

  private authenticated(client: AuthSocket): boolean {
    if (client.userId && client.accessExpiresAt! > Date.now()
      && this.activeSockets.get(client.userId)?.has(client)) return true;
    this.disconnect(client);
    return false;
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        algorithms: ['HS256'],
        issuer: 'lovnge-api',
        audience: 'lovnge-client',
      });

      if (payload.type !== 'access') throw new UnauthorizedException('Invalid token type');
      // Track pending authentication before the asynchronous DB check so a
      // concurrent revocation cannot be missed. No userId/room access yet.
      client.sessionUserId = payload.sub;
      const sockets = this.activeSockets.get(payload.sub) ?? new Set<AuthSocket>();
      sockets.add(client);
      this.activeSockets.set(payload.sub, sockets);
      const [user] = await this.db
        .select({ status: users.status, tokensValidAfter: users.tokensValidAfter })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      assertSessionActive(payload, user);
      if (!this.activeSockets.get(payload.sub)?.has(client)) return;
      const expiresIn = payload.exp * 1000 - Date.now();
      if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new UnauthorizedException('Token expired');

      client.userId = payload.sub;
      client.role = payload.role;
      client.accessExpiresAt = payload.exp * 1000;
      client.expiryTimer = setTimeout(() => this.disconnect(client), expiresIn);
      client.expiryTimer.unref();

      // Подключаем к личной комнате пользователя
      client.join(`user:${payload.sub}`);
      client.emit('session_ready');
      this.logger.log(`Client connected: ${payload.sub}`);
    } catch {
      this.disconnect(client);
    }
  }

  handleDisconnect(client: AuthSocket) {
    const userId = client.userId;
    this.forget(client);
    if (userId) {
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!this.authenticated(client)) return { error: 'Unauthorized' };
    const room = `conv:${data.conversationId}`;
    try {
      await this.messagesService.markRead(data.conversationId, client.userId!, client.role);
      if (!this.authenticated(client)) return { error: 'Unauthorized' };
      await client.join(room);
      if (!this.authenticated(client)) { client.leave(room); return { error: 'Unauthorized' }; }
      return { ok: true };
    } catch {
      client.leave(room);
      return { error: 'Forbidden' };
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!this.authenticated(client)) return { error: 'Unauthorized' };
    client.leave(`conv:${data.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string; content: string; attachmentUrl?: string },
  ) {
    if (!this.authenticated(client)) return { error: 'Unauthorized' };
    if (!data.content?.trim() && !data.attachmentUrl) return { error: 'Empty message' };

    try {
      const msg = await this.messagesService.saveMessage(
        data.conversationId,
        client.userId!,
        client.role ?? 'client',
        data.content?.trim() ?? '',
        data.attachmentUrl,
      );

      // Рассылаем всем в комнате диалога
      this.server.to(`conv:${data.conversationId}`).emit('new_message', {
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      });

      return { ok: true, messageId: msg.id };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!this.authenticated(client)) return { error: 'Unauthorized' };
    try {
      await this.messagesService.markRead(data.conversationId, client.userId!, client.role);
      return { ok: true };
    } catch { return { error: 'Forbidden' }; }
  }

  /** Отправить уведомление пользователю в его личную комнату */
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}

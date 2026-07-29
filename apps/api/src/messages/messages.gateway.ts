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
import { Logger } from '@nestjs/common';

interface AuthSocket extends Socket {
  userId?: string;
  role?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
        issuer: 'lovnge-api',
        audience: 'lovnge-client',
      });

      client.userId = payload.sub;
      client.role = payload.role;

      // Подключаем к личной комнате пользователя
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (client.userId) {
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
    await this.messagesService.markRead(data.conversationId, client.userId!);
    return { ok: true };
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conv:${data.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    if (!client.userId) return { error: 'Unauthorized' };
    if (!data.content?.trim()) return { error: 'Empty message' };

    try {
      const msg = await this.messagesService.saveMessage(
        data.conversationId,
        client.userId,
        client.role ?? 'client',
        data.content.trim(),
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
    if (!client.userId) return;
    await this.messagesService.markRead(data.conversationId, client.userId);
    return { ok: true };
  }

  /** Отправить уведомление пользователю в его личную комнату */
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}

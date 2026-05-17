import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { ChatService } from './chat.service';
import { MessagesService } from './messages.service';
import { ChatEventsService } from './events.service';
import { ChannelMemberGuard } from './guards/channel-member.guard';
import { ChatChannelsController } from './chat.controller';
import { ChatMessagesController } from './messages.controller';
import { ChatStreamController } from './stream.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('jwt.secret'),
        signOptions: { expiresIn: (cfg.get<string>('jwt.expiresIn') ?? '15m') as any },
      }),
    }),
  ],
  controllers: [ChatChannelsController, ChatMessagesController, ChatStreamController],
  providers: [ChatService, MessagesService, ChatEventsService, ChannelMemberGuard],
  exports: [ChatService, MessagesService, ChatEventsService],
})
export class ChatModule {}

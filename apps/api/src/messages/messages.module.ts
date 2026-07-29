import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { MessagesController } from './messages.controller';
import { AntiLeakService } from '../communications/anti-leak.service';

@Module({
  imports: [
    AuthGuardsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow('JWT_SECRET'),
      }),
    }),
  ],
  providers: [MessagesService, MessagesGateway, AntiLeakService],
  controllers: [MessagesController],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}

import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { ScreenshotService } from './screenshot.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ToolsController],
  providers: [ToolsService, ScreenshotService],
  exports: [ToolsService, ScreenshotService],
})
export class ToolsModule {}

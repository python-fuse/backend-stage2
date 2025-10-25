import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CountriesModule } from './countries/countries.module';
import { PrismaService } from './prisma.service';

import { ConfigModule } from '@nestjs/config';
import { ImageService } from './image.service';

@Module({
  imports: [
    CountriesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, ImageService],
})
export class AppModule {}

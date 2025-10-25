import { Module } from '@nestjs/common';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { PrismaService } from 'src/prisma.service';
import { ImageService } from 'src/image.service';

@Module({
  controllers: [CountriesController],
  providers: [CountriesService, PrismaService, ImageService],
})
export class CountriesModule {}

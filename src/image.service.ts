import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';

@Injectable()
export class ImageService {
  constructor(private prisma: PrismaService) {}
  async generateCountrySummaryImage() {
    // Total number of countries
    // Top 5 countries by estimated GDP
    // Timestamp of last refresh
    // Save the generated image on disk at cache/summary.png.

    const totalCountries = await this.prisma.country.count();
    const topFiveCountries = await this.prisma.country.findMany({
      orderBy: { estimated_gdp: 'desc' },
      take: 5,
    });
    const lastRefreshedMetadata = await this.prisma.metadata.findFirst({
      select: { last_refreshed_at: true },
    });

    const canvasWidth = 800;
    const canvasHeight = 600;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Country Summary', 20, 40);

    // Total countries
    ctx.font = '18px Arial';
    ctx.fillText(`Total Countries: ${totalCountries}`, 20, 80);

    // Top 5 countries by GDP
    ctx.fillText('Top 5 Countries by Estimated GDP:', 20, 120);

    for (let i = 0; i < topFiveCountries.length; i++) {
      const country = topFiveCountries[i];
      try {
        if (country.flag_url) {
          const flagImage = await loadImage(country.flag_url);
          ctx.drawImage(flagImage, 20, 150 + i * 80, 64, 48);
        }
      } catch (error) {
        console.error(`Error loading flag image for ${country.name}:`, error);
      }

      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText(
        `${i + 1}. ${country.name} - GDP: ${
          country.estimated_gdp
            ? `$${country.estimated_gdp.toLocaleString()}`
            : 'N/A'
        }`,
        100,
        180 + i * 80,
      );
    }
    // Last refreshed timestamp
    const lastRefreshed = lastRefreshedMetadata?.last_refreshed_at
      ? lastRefreshedMetadata.last_refreshed_at.toLocaleString()
      : 'N/A';
    ctx.fillText(`Last Refreshed: ${lastRefreshed}`, 20, 550);

    //   Save image to disk
    const buffer = canvas.toBuffer('image/png');

    if (!fs.existsSync('cache')) {
      fs.mkdirSync('cache');
    }

    fs.writeFileSync('cache/summary.png', buffer);
  }
}

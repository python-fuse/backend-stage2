import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post('refresh')
  refetchCountries() {
    return this.countriesService.refreshCountries();
  }

  @Get()
  async getCountries() {
    const countries = await this.countriesService.getCountries();
    return await JSON.parse(
      JSON.stringify(countries, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    );
  }

  @Get(':name')
  getCountryByName() {}

  @Get('image')
  getTopFiveCountriesImageSummary() {
    const imagePath = join(process.cwd(), 'cache/summary.png');
    console.log(imagePath);

    if (!existsSync(imagePath)) {
      throw new NotFoundException({ error: 'Summary image not found' });
    }

    const imageStream = createReadStream(imagePath);

    return new StreamableFile(imageStream, {
      type: 'image/png',
      disposition: 'inline; filename="summary.png"',
    });
  }

  @Delete(':name')
  deleteCountryByName() {}
}

import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
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

  @Get('image')
  getTopFiveCountriesImageSummary() {
    const imagePath = join(process.cwd(), 'cache/summary.png');

    if (!existsSync(imagePath)) {
      throw new NotFoundException({ error: 'Summary image not found' });
    }

    const imageStream = createReadStream(imagePath);

    return new StreamableFile(imageStream, {
      type: 'image/png',
      disposition: 'inline; filename="summary.png"',
    });
  }

  @Get(':name')
  async getCountryByName(@Param('name') name: string) {
    const country = await this.countriesService.getCountryByName(name);
    return await JSON.parse(
      JSON.stringify(country, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    );
  }

  @Get()
  async getCountries(
    @Query('region') region?: string,
    @Query('currency') currency?: string,
    @Query('sort') sort?: string,
  ) {
    const countries = await this.countriesService.getCountriesWithFilters({
      region,
      currency,
      sort,
    });
    return await JSON.parse(
      JSON.stringify(countries, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    );
  }

  @Delete(':name')
  deleteCountryByName(@Param('name') name: string) {
    return this.countriesService.deleteCountryByName(name);
  }
}

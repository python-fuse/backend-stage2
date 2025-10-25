import { Controller, Delete, Get, Post } from '@nestjs/common';
import { CountriesService } from './countries.service';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post('refetch')
  refetchCountries() {
    return this.countriesService.refreshCountries();
  }

  @Get()
  getCountries() {}

  @Get(':name')
  getCountryByName() {}

  @Get('image')
  getTopFiveCountriesImageSummary() {}

  @Delete(':name')
  deleteCountryByName() {}
}

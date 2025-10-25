import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { ImageService } from 'src/image.service';
import axios from 'axios';
import { CountryFromAPI } from 'src/utils/definitions';
import { generateMultiplier } from 'src/utils';

@Injectable()
export class CountriesService {
  private readonly countriesApiUrl: string | undefined;
  private readonly ratesApiUrl: string | undefined;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private imageService: ImageService,
  ) {
    this.countriesApiUrl = this.config.get<string>('COUNTRIES_API_URL');
    this.ratesApiUrl = this.config.get<string>('RATES_API_URL');

    if (!this.countriesApiUrl || !this.ratesApiUrl) {
      throw new Error('API URLs are not defined');
    }
  }

  getCountryByName(name: string) {
    const normalizedName = name.trim().toLowerCase();
    const dbCountry = this.prisma.country.findFirst({
      where: {
        name: {
          equals: normalizedName,
        },
      },
    });

    if (!dbCountry) {
      throw new NotFoundException({
        error: 'Country not found',
        details: `No country found with name: ${name}`,
      });
    }
  }

  async getCountriesWithFilters(filterParams?: {
    region?: string;
    currency?: string;
    sort?: string;
  }) {
    const { region, currency, sort } = filterParams || {};

    const whereClause: any = {};

    if (region) {
      whereClause.region = region;
    }

    if (currency) {
      whereClause.currency_code = currency;
    }

    let orderByClause: any = {};
    if (sort) {
      const [field, direction] = sort.split('_');

      const fieldMapping: Record<string, string> = {
        gdp: 'estimated_gdp',
        name: 'name',
        population: 'population',
        exchange_rate: 'exchange_rate',
      };

      const mappedField = fieldMapping[field] || field;

      orderByClause[mappedField] = direction.toLowerCase();
    }

    const countries = await this.prisma.country.findMany({
      where: whereClause,
      orderBy: orderByClause,
    });

    return countries;
  }

  getCountries() {
    return this.prisma.country.findMany();
  }

  async getStatusSummary() {
    const totalCountries = await this.prisma.country.count();
    const last_refreshed_at = await this.prisma.metadata.findUnique({
      where: { id: 1 },
      select: { last_refreshed_at: true },
    });

    return {
      total_countries: totalCountries,
      last_refreshed_at: last_refreshed_at?.last_refreshed_at || null,
    };
  }

  async refreshCountries() {
    const allProcessedCountries: any[] = [];

    // Handle fetching countries and exchange rates
    try {
      const countriesApiResponse = await axios.get(this.countriesApiUrl!);
      const countriesData = countriesApiResponse.data as CountryFromAPI[];

      const allExchangeRatesResponse = await axios.get(this.ratesApiUrl!);
      const exchangeRatesData = allExchangeRatesResponse.data.rates;

      for (const country of countriesData) {
        let newCountryEntry: any = {};

        if (!country.currencies) {
          newCountryEntry.currency_code = null;
          newCountryEntry.exchange_rate = null;
          newCountryEntry.estimated_gdp = null;
        } else if (!exchangeRatesData[country.currencies[0].code]) {
          newCountryEntry.exchange_rate = null;
          newCountryEntry.currency_code = country.currencies[0].code;
          newCountryEntry.estimated_gdp = null;
        } else {
          newCountryEntry.exchange_rate =
            exchangeRatesData[country.currencies[0].code];
          newCountryEntry.currency_code = country.currencies[0].code;
          if (country.population && newCountryEntry.exchange_rate) {
            newCountryEntry.estimated_gdp =
              (country.population * generateMultiplier()) /
              newCountryEntry.exchange_rate;
          }
        }

        newCountryEntry = {
          ...newCountryEntry,
          name: country.name,
          capital: country.capital || null,
          region: country.region || null,
          population: country.population || 0,
          currency_code: country.currencies ? country.currencies[0].code : null,
          flag_url: country.flag || null,
        };

        allProcessedCountries.push(newCountryEntry);
      }
    } catch (error: any) {
      throw new ServiceUnavailableException({
        error: 'External data source unavailable',
        details: `Could not fetch data from ${this.countriesApiUrl} or ${this.ratesApiUrl}`,
      });
    }

    // Now update the database with processed countries as a batch
    try {
      await this.prisma.$transaction(
        async (prisma) => {
          // Insert new countries
          for (const countryData of allProcessedCountries) {
            await prisma.country.upsert({
              where: { name: countryData.name },
              update: { ...countryData },
              create: { ...countryData },
            });
          }

          // update the metadata last_refreshed_at
          const now = new Date();
          await prisma.metadata.upsert({
            where: { id: 1 },
            create: { last_refreshed_at: now },
            update: { last_refreshed_at: now },
          });
        },
        {
          timeout: 60000,
          maxWait: 60000,
        },
      );
    } catch (error: any) {
      throw new InternalServerErrorException({
        error: `Database update failed: ${error.message}`,
      });
    }

    // now try generate an image summary for top five countries
    try {
      await this.imageService.generateCountrySummaryImage();
    } catch (error: any) {
      throw new InternalServerErrorException({
        error: `Image generation failed: ${error.message}`,
      });
    }

    return { message: 'Countries refreshed successfully' };
  }

  deleteCountryByName(name: string) {
    const normalizedName = name.trim().toLowerCase();

    const dbCountry = this.prisma.country.findFirst({
      where: {
        name: {
          equals: normalizedName,
        },
      },
    });

    if (!dbCountry) {
      throw new NotFoundException({
        error: 'Country not found',
        details: `No country found with name: ${name}`,
      });
    }
    return this.prisma.country.deleteMany({
      where: {
        name: {
          equals: normalizedName,
        },
      },
    });
  }
}

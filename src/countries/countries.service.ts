import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';

import axios from 'axios';
import { CountryFromAPI } from 'src/utils/definitions';
import { Country } from 'prisma/generated/client';
import { CountryCreateInput } from 'prisma/generated/models';
import e from 'express';
import { generateMultiplier } from 'src/utils';

@Injectable()
export class CountriesService {
  private readonly countriesApiUrl: string | undefined;
  private readonly ratesApiUrl: string | undefined;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.countriesApiUrl = this.config.get<string>('COUNTRIES_API_URL');
    this.ratesApiUrl = this.config.get<string>('RATES_API_URL');

    if (!this.countriesApiUrl || !this.ratesApiUrl) {
      throw new Error('API URLs are not defined');
    }
  }

  async refreshCountries() {
    const allProcessedCountries: Country[] = [];

    // Handle fetching countries and exchange rates
    try {
      const countriesApiResponse = await axios.get(this.countriesApiUrl!);
      const countriesData = countriesApiResponse.data as CountryFromAPI[];

      const allExchangeRatesResponse = await axios.get(this.ratesApiUrl!);
      const exchangeRatesData = allExchangeRatesResponse.data.rates;

      for (const country of countriesData) {
        let newCountryEntry: Partial<CountryCreateInput> = {};

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
          population: country.population || undefined,
          currency_code: country.currencies ? country.currencies[0].code : null,
          flag_url: country.flag || null,
        };

        allProcessedCountries.push(newCountryEntry as Country);
      }
    } catch (error: any) {
      throw new Error(`Failed to refresh countries: ${error.message}`);
    }

    // Now update the database with processed countries as a batch
    try {
      await this.prisma.$transaction(async (prisma) => {
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
        await prisma.metadata.update({
          where: { id: 1 },
          data: { last_refreshed_at: now },
        });
      });
    } catch (error: any) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    // now try generate an image summary for top five countries

    return { message: 'Countries refreshed successfully' };
  }
}

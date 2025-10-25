export type CountryFromAPI = {
  name: string;
  capital: string;
  region: string;
  population: number;
  currencies: {
    code: string;
    name: string;
    symbol: string;
  }[];
  flag: string;
  independent: boolean;
};

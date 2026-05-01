import citiesData from './turkey-data.json';

export interface City {
  name: string;
  districts: string[];
}

export const getCities = (): City[] => {
  return citiesData as City[];
};

export const getCityNames = (): string[] => {
  return citiesData.map((c) => c.name);
};

export const getDistrictsOfCity = (cityName: string): string[] => {
  const city = citiesData.find((c) => c.name === cityName);
  return city ? city.districts : [];
};

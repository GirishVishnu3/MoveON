// Country and city data for MoveON platform
// Supports India and United Kingdom

export type CountryCode = 'IN' | 'GB';

export interface CityData {
  name: string;
  lat: number;
  lon: number;
  center: string;
  viewbox: string;
  aliases: string[];
  countryCode: CountryCode;
}

export interface CountryData {
  code: CountryCode;
  name: string;
  flag: string;
  nominatimCountryCodes: string; // for Nominatim `countrycodes=` param
  defaultCity: string;
  currencyCode: string;
  currencySymbol: string;
}

export const COUNTRIES: CountryData[] = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    nominatimCountryCodes: 'in',
    defaultCity: 'Bengaluru',
    currencyCode: 'INR',
    currencySymbol: '₹',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    nominatimCountryCodes: 'gb',
    defaultCity: 'London',
    currencyCode: 'GBP',
    currencySymbol: '£',
  },
];

export const CITIES_BY_COUNTRY: Record<CountryCode, CityData[]> = {
  IN: [
    { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, center: 'MG Road, Bengaluru', viewbox: '77.30,12.70,77.85,13.25', aliases: ['bengaluru', 'bangalore'], countryCode: 'IN' },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777, center: 'Marine Drive, Mumbai', viewbox: '72.65,18.75,73.15,19.45', aliases: ['mumbai', 'bombay'], countryCode: 'IN' },
    { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090, center: 'Connaught Place, New Delhi', viewbox: '76.75,28.25,77.55,28.95', aliases: ['delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'ghaziabad', 'faridabad'], countryCode: 'IN' },
    { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, center: 'HITEC City, Hyderabad', viewbox: '78.15,17.10,78.75,17.70', aliases: ['hyderabad', 'secunderabad'], countryCode: 'IN' },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707, center: 'Anna Salai, Chennai', viewbox: '80.00,12.75,80.40,13.35', aliases: ['chennai', 'madras'], countryCode: 'IN' },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639, center: 'Park Street, Kolkata', viewbox: '88.15,22.25,88.55,22.85', aliases: ['kolkata', 'calcutta'], countryCode: 'IN' },
    { name: 'Pune', lat: 18.5204, lon: 73.8567, center: 'FC Road, Pune', viewbox: '73.55,18.25,74.15,18.85', aliases: ['pune'], countryCode: 'IN' },
    { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, center: 'CG Road, Ahmedabad', viewbox: '72.30,22.75,72.85,23.30', aliases: ['ahmedabad', 'gandhinagar'], countryCode: 'IN' },
    { name: 'Jaipur', lat: 26.9124, lon: 75.7873, center: 'MI Road, Jaipur', viewbox: '75.55,26.65,76.05,27.15', aliases: ['jaipur'], countryCode: 'IN' },
    { name: 'Kochi', lat: 9.9312, lon: 76.2673, center: 'MG Road, Kochi', viewbox: '76.05,9.75,76.55,10.25', aliases: ['kochi', 'cochin', 'ernakulam'], countryCode: 'IN' },
    { name: 'Vizag', lat: 17.6868, lon: 83.2185, center: 'RK Beach, Visakhapatnam', viewbox: '83.10,17.50,83.40,17.90', aliases: ['vizag', 'visakhapatnam', 'waltair'], countryCode: 'IN' },
    { name: 'Vijayawada', lat: 16.5062, lon: 80.6480, center: 'Benz Circle, Vijayawada', viewbox: '80.50,16.30,80.80,16.70', aliases: ['vijayawada', 'bezawada'], countryCode: 'IN' },
  ],
  GB: [
    { name: 'London', lat: 51.5074, lon: -0.1278, center: 'Central London', viewbox: '-0.51,51.28,0.33,51.70', aliases: ['london', 'greater london', 'city of london'], countryCode: 'GB' },
    { name: 'Manchester', lat: 53.4808, lon: -2.2426, center: 'Piccadilly Gardens, Manchester', viewbox: '-2.50,53.35,-2.05,53.65', aliases: ['manchester', 'salford'], countryCode: 'GB' },
    { name: 'Birmingham', lat: 52.4862, lon: -1.8904, center: 'City Centre, Birmingham', viewbox: '-2.10,52.35,-1.70,52.65', aliases: ['birmingham', 'brum'], countryCode: 'GB' },
    { name: 'Newcastle', lat: 54.9783, lon: -1.6178, center: 'City Centre, Newcastle upon Tyne', viewbox: '-1.85,54.90,-1.40,55.05', aliases: ['newcastle', 'newcastle upon tyne', 'tyne'], countryCode: 'GB' },
    { name: 'Leeds', lat: 53.8008, lon: -1.5491, center: 'City Centre, Leeds', viewbox: '-1.85,53.65,-1.25,53.95', aliases: ['leeds'], countryCode: 'GB' },
    { name: 'Glasgow', lat: 55.8642, lon: -4.2518, center: 'City Centre, Glasgow', viewbox: '-4.55,55.75,-3.95,56.00', aliases: ['glasgow'], countryCode: 'GB' },
    { name: 'Edinburgh', lat: 55.9533, lon: -3.1883, center: 'Old Town, Edinburgh', viewbox: '-3.40,55.85,-2.95,56.05', aliases: ['edinburgh'], countryCode: 'GB' },
    { name: 'Bristol', lat: 51.4545, lon: -2.5879, center: 'City Centre, Bristol', viewbox: '-2.80,51.35,-2.40,51.55', aliases: ['bristol'], countryCode: 'GB' },
    { name: 'Liverpool', lat: 53.4084, lon: -2.9916, center: 'City Centre, Liverpool', viewbox: '-3.20,53.30,-2.75,53.55', aliases: ['liverpool'], countryCode: 'GB' },
    { name: 'Sheffield', lat: 53.3811, lon: -1.4701, center: 'City Centre, Sheffield', viewbox: '-1.70,53.30,-1.25,53.50', aliases: ['sheffield'], countryCode: 'GB' },
    { name: 'Nottingham', lat: 52.9548, lon: -1.1581, center: 'Old Market Square, Nottingham', viewbox: '-1.35,52.85,-0.95,53.05', aliases: ['nottingham', 'notts'], countryCode: 'GB' },
    { name: 'Cambridge', lat: 52.2053, lon: 0.1218, center: 'City Centre, Cambridge', viewbox: '-0.05,52.10,0.30,52.35', aliases: ['cambridge'], countryCode: 'GB' },
    { name: 'Oxford', lat: 51.7520, lon: -1.2577, center: 'City Centre, Oxford', viewbox: '-1.35,51.70,-1.15,51.80', aliases: ['oxford'], countryCode: 'GB' },
    { name: 'Cardiff', lat: 51.4816, lon: -3.1791, center: 'City Centre, Cardiff', viewbox: '-3.30,51.40,-3.05,51.55', aliases: ['cardiff'], countryCode: 'GB' },
    { name: 'Belfast', lat: 54.5973, lon: -5.9301, center: 'City Centre, Belfast', viewbox: '-6.05,54.52,-5.80,54.67', aliases: ['belfast'], countryCode: 'GB' },
    { name: 'Southampton', lat: 50.9097, lon: -1.4044, center: 'City Centre, Southampton', viewbox: '-1.50,50.85,-1.30,50.97', aliases: ['southampton'], countryCode: 'GB' },
    { name: 'Brighton', lat: 50.8225, lon: -0.1372, center: 'City Centre, Brighton', viewbox: '-0.25,50.78,-0.05,50.87', aliases: ['brighton', 'hove'], countryCode: 'GB' },
    { name: 'York', lat: 53.9600, lon: -1.0873, center: 'City Centre, York', viewbox: '-1.20,53.90,-0.95,54.02', aliases: ['york'], countryCode: 'GB' },
    { name: 'Aberdeen', lat: 57.1497, lon: -2.0943, center: 'City Centre, Aberdeen', viewbox: '-2.20,57.10,-1.98,57.20', aliases: ['aberdeen'], countryCode: 'GB' },
    { name: 'Bath', lat: 51.3811, lon: -2.3590, center: 'City Centre, Bath', viewbox: '-2.45,51.33,-2.25,51.43', aliases: ['bath'], countryCode: 'GB' },
    { name: 'Sunderland', lat: 54.9069, lon: -1.3811, center: 'City Centre, Sunderland', viewbox: '-1.50,54.84,-1.25,54.97', aliases: ['sunderland'], countryCode: 'GB' },
    { name: 'Leicester', lat: 52.6369, lon: -1.1398, center: 'City Centre, Leicester', viewbox: '-1.25,52.57,-1.02,52.70', aliases: ['leicester'], countryCode: 'GB' },
  ],
};

// Flat list of all cities across both countries
export const ALL_CITIES: CityData[] = [
  ...CITIES_BY_COUNTRY.IN,
  ...CITIES_BY_COUNTRY.GB,
];

export function getCitiesForCountry(countryCode: CountryCode): CityData[] {
  return CITIES_BY_COUNTRY[countryCode] || [];
}

export function getCountryForCity(cityName: string): CountryData | undefined {
  const city = ALL_CITIES.find(c => c.name === cityName);
  if (!city) return undefined;
  return COUNTRIES.find(c => c.code === city.countryCode);
}

export function getCurrencyForCountry(countryCode: CountryCode): { code: string; symbol: string } {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return {
    code: country?.currencyCode || (countryCode === 'GB' ? 'GBP' : 'INR'),
    symbol: country?.currencySymbol || (countryCode === 'GB' ? '£' : '₹'),
  };
}

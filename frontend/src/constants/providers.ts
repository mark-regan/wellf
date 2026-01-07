import { ProviderLists, PortfolioType } from '@/types';

export const DEFAULT_PROVIDERS: ProviderLists = {
  GIA: ['Hargreaves Lansdown', 'Trading 212', 'Freetrade', 'Interactive Investor', 'AJ Bell', 'Vanguard'],
  ISA: ['Hargreaves Lansdown', 'Vanguard', 'Trading 212', 'Fidelity', 'AJ Bell', 'Interactive Investor', 'Freetrade'],
  SIPP: ['Hargreaves Lansdown', 'AJ Bell', 'Interactive Investor', 'Vanguard', 'Fidelity'],
  LISA: ['AJ Bell', 'Hargreaves Lansdown', 'Moneybox', 'Nutmeg'],
  JISA: ['Hargreaves Lansdown', 'Fidelity', 'Vanguard', 'AJ Bell'],
  CRYPTO: ['Coinbase', 'Kraken', 'Binance', 'Ledger', 'Trezor'],
  SAVINGS: ['Chase', 'Monzo', 'Starling', 'Marcus', 'Zopa', 'Chip'],
  CASH: ['Monzo', 'Starling', 'NatWest', 'Barclays', 'HSBC', 'Lloyds', 'Santander', 'Chase'],
};

export const PORTFOLIO_TYPE_LABELS: Record<string, string> = {
  GIA: 'General Investment Account',
  ISA: 'ISA',
  SIPP: 'SIPP (Pension)',
  LISA: 'Lifetime ISA',
  JISA: 'Junior ISA',
  CRYPTO: 'Crypto',
  SAVINGS: 'Savings',
  CASH: 'Cash',
};

export function parseProviderLists(json: string | undefined): ProviderLists {
  if (!json) return {};
  try {
    return JSON.parse(json) as ProviderLists;
  } catch {
    return {};
  }
}

export function stringifyProviderLists(lists: ProviderLists): string {
  return JSON.stringify(lists);
}

export function getProvidersForType(
  lists: ProviderLists | undefined,
  type: PortfolioType | string
): string[] {
  const key = type as keyof ProviderLists;
  const userProviders = lists?.[key];
  if (userProviders && userProviders.length > 0) {
    return userProviders;
  }
  return DEFAULT_PROVIDERS[key] || [];
}

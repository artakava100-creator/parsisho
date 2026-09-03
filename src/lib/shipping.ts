import type { ShippingMode, StoreSettings } from '@/types';

export interface ShippingCalculationInput {
  settings: StoreSettings;
  subtotal: number;
  province: string;
  city: string;
  postalCode: string;
}

export interface ShippingCalculationResult {
  cost: number;
  mode: ShippingMode;
  isProviderCalculated: boolean;
  providerName: string | null;
  notConfigured: boolean;
}

export interface ShippingProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;
  calculateRate(input: ShippingCalculationInput): Promise<ShippingCalculationResult>;
}

class FreeShippingProvider implements ShippingProvider {
  readonly id = 'free';
  readonly name = 'ارسال رایگان';
  readonly isConfigured = true;

  async calculateRate(): Promise<ShippingCalculationResult> {
    return { cost: 0, mode: 'free', isProviderCalculated: false, providerName: null, notConfigured: false };
  }
}

class FixedShippingProvider implements ShippingProvider {
  readonly id = 'fixed';
  readonly name = 'هزینه ثابت';
  readonly isConfigured = true;

  constructor(private fixedFee: number) {}

  async calculateRate(): Promise<ShippingCalculationResult> {
    return { cost: this.fixedFee, mode: 'fixed', isProviderCalculated: false, providerName: null, notConfigured: false };
  }
}

const providerRegistry = new Map<string, ShippingProvider>();

export function registerShippingProvider(provider: ShippingProvider): void {
  providerRegistry.set(provider.id, provider);
}

export function getShippingProvider(providerId: string | null): ShippingProvider | null {
  if (!providerId) return null;
  return providerRegistry.get(providerId) ?? null;
}

export function getRegisteredProviders(): ShippingProvider[] {
  return Array.from(providerRegistry.values());
}

export async function calculateShipping(input: ShippingCalculationInput): Promise<ShippingCalculationResult> {
  const { settings } = input;

  switch (settings.shippingMode) {
    case 'free':
      return new FreeShippingProvider().calculateRate();

    case 'fixed':
      return new FixedShippingProvider(settings.fixedShippingFee).calculateRate();

    case 'provider': {
      const provider = getShippingProvider(settings.shippingProvider);
      if (!provider || !provider.isConfigured) {
        return {
          cost: 0,
          mode: 'provider',
          isProviderCalculated: true,
          providerName: settings.shippingProvider,
          notConfigured: true,
        };
      }
      return provider.calculateRate(input);
    }

    default:
      return { cost: 0, mode: 'free', isProviderCalculated: false, providerName: null, notConfigured: false };
  }
}

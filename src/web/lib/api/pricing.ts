import { publicApiClient } from '../api-client';

export interface PricingConfig {
  handlingFeePerModel: number;
  machineRatePerHour: number;
  qualityMultipliers: Record<string, number>;
}

export const pricingApi = {
  getConfig: () =>
    publicApiClient.get<PricingConfig>('/Pricing/config'),
};
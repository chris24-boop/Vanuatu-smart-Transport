import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultApiHost =
  Platform.OS === 'android'
    ? developmentHost || '10.0.2.2'
    : 'localhost';

export const API_BASE_URL =
  configuredApiUrl || `http://${defaultApiHost}:3000/api/v1`;

export const APP_NAME = 'Vanuatu Transport';

export const CURRENCY = 'VT';
export const CURRENCY_CODE = 'VUV';

export const COUNTRY_CODE = '+678';

export const TRANSPORT_TYPES = {
  BUS: 'BUS',
  TAXI: 'TAXI',
  CAR: 'CAR',
} as const;

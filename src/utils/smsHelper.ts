import { Linking, Alert, Platform } from 'react-native';

export interface BookingSmsDetails {
  driverPhone: string;
  driverName?: string;
  pickup: string;
  dropoff: string;
  seats: number;
  fare: number;
  passengerName: string;
  passengerPhone: string;
  vehiclePlate?: string;
  cargoNotes?: string;
}

export interface EmergencySosDetails {
  vehiclePlate?: string;
  driverName?: string;
  route?: string;
  latitude?: number | null;
  longitude?: number | null;
  passengerName?: string;
  emergencyPhone?: string; // Default to police or family
}

/**
 * Normalizes phone numbers for Vanuatu (+678 prefix or local digits)
 */
export function formatVanuatuPhone(phone: string): string {
  const clean = (phone || '').replace(/[^0-9+]/g, '');
  if (!clean) return '+678';
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('678')) return `+${clean}`;
  return clean; // Local 5 or 7 digit number
}

/**
 * Triggers the native phone SMS composer with pre-filled booking details.
 * Useful when passenger or driver has no 3G/4G data coverage.
 */
export async function sendBookingViaSms(details: BookingSmsDetails): Promise<boolean> {
  const targetPhone = formatVanuatuPhone(details.driverPhone);

  const cargoLine = details.cargoNotes?.trim() ? `\n📦 Kago: ${details.cargoNotes.trim()}` : '';

  const body =
`[VANUATU SMART TRANSPORT - BUKING]
Halo ${details.driverName || 'Drayva'}, mi wantem bukem transpot:
📍 Pikimap: ${details.pickup}
🏁 Dropem: ${details.dropoff}
👥 Pasenja: ${details.seats}
💰 Fia: ${details.fare} VT${cargoLine}
👤 Pasenja: ${details.passengerName}
📞 Fon: ${details.passengerPhone}
Plis riplae kwiktaem sipos yu save karem mi. Tankyu tumas!`;

  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${targetPhone}${separator}body=${encodeURIComponent(body)}`;

  try {
    const supported = await Linking.canOpenURL(url).catch(() => true);
    if (!supported) {
      Alert.alert('SMS Error', 'Unable to open SMS application on this device.');
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Failed to open SMS composer:', error);
    Alert.alert('SMS Error', 'Could not open SMS composer.');
    return false;
  }
}

/**
 * Emergency 1-tap SOS SMS sender with GPS location & vehicle plate.
 */
export async function sendEmergencySosSms(details: EmergencySosDetails): Promise<boolean> {
  const policeEmergencyPhone = details.emergencyPhone || '111'; // Vanuatu Police

  const mapsLink = details.latitude && details.longitude
    ? `https://maps.google.com/?q=${details.latitude},${details.longitude}`
    : 'Lokesen i stap klosap long Port Vila / Efate';

  const body =
`🚨 [EMAGENSI SOS - VANUATU TRANSPOR]
Mi nidim help kwiktaem! Mi stap insaed long wan transpot:
🚗 Namba blong Plet: ${details.vehiclePlate || 'N/A'}
👤 Drayva: ${details.driverName || 'N/A'}
🛣️ Rod: ${details.route || 'Efate / Vanuatu Road'}
📍 GPS Lokesen: ${mapsLink}
👤 Pasenja: ${details.passengerName || 'Pasenja'}
Plis asistim mi kwiktaem!`;

  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${policeEmergencyPhone}${separator}body=${encodeURIComponent(body)}`;

  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Failed to open Emergency SMS:', error);
    Alert.alert('SOS Error', 'Unable to send emergency SMS.');
    return false;
  }
}

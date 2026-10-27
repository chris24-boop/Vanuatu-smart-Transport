// Vanuatu Public Transport Regulated Fares
// Urban Port Vila & Luganville: Official flat rate is 150 VT per passenger.
// Outer zones and rural ring roads follow established transport association bands.

export interface TransportZone {
  id: 'ZONE_1' | 'ZONE_2' | 'ZONE_3';
  name: string;
  nameBi: string;
  nameFr: string;
  busFare: number;
  taxiMinFare: number;
  taxiMaxFare: number;
  publicTransportFare: number;
  description: string;
  descriptionBi: string;
  presets: string[];
}

export const REGULATED_ZONES: TransportZone[] = [
  {
    id: 'ZONE_1',
    name: 'Urban Port Vila & Luganville',
    nameBi: 'Taon Fia (Port Vila / Luganville)',
    nameFr: 'Zone Urbaine Port-Vila & Luganville',
    busFare: 150,
    taxiMinFare: 300,
    taxiMaxFare: 500,
    publicTransportFare: 150,
    description: 'Flat rate 150 VT per passenger anywhere within town limits.',
    descriptionBi: 'Flet praes 150 VT evriwea insaed long taon.',
    presets: [
      'Port Vila Central Market',
      'Port Vila Seafront & Cultural Centre',
      'Main Wharf (Cargo Berth)',
      'Star Wharf (Domestic Wharf)',
      'Freswota 1, 2, 3, 4, 5, 6',
      'Namburu & Tebakor',
      'Nambatri & USP Campus',
      'Tagabe & Agriculture Station',
      'Colardeau & Anabrou',
      'Seaside & Paama',
      'Luganville Main Street & Wharf',
      'Chapuis & Mango Station',
    ],
  },
  {
    id: 'ZONE_2',
    name: 'Suburban & Attractions (Zone 2)',
    nameBi: 'Zon 2 (Klosap long taon & ol turis ples)',
    nameFr: 'Zone 2 Périurbaine & Attractions',
    busFare: 250,
    taxiMinFare: 700,
    taxiMaxFare: 1000,
    publicTransportFare: 250,
    description: 'Extended town route between 250 VT and 300 VT per seat.',
    descriptionBi: 'Rod we i go aotsaed lelebet long taon (250 VT kasem 300 VT).',
    presets: [
      'Mele Village',
      'Mele Cascades & Waterfall',
      'Hideaway Island Landing',
      'Pango Point & Breakas',
      'Teouma Valley & River',
      'Bladiniere Estate',
      'Klems Hill Viewpoint',
      'Devil\'s Point Road',
      'Bauerfield Airport (Cargo / Outskirts)',
      'Erakor Village & Jetty',
      'Banban & Solway (Santo)',
    ],
  },
  {
    id: 'ZONE_3',
    name: 'Rural Efate / Ring Road / Outer Islands (Zone 3)',
    nameBi: 'Zon 3 (Ring Rod blong Efate & Aelan)',
    nameFr: 'Zone 3 Rurale Efate & Grande Terre',
    busFare: 500,
    taxiMinFare: 1500,
    taxiMaxFare: 3000,
    publicTransportFare: 500,
    description: 'Long-distance travel along Efate Ring Road (500 VT to 1,000 VT).',
    descriptionBi: 'Long rod raonem Efate o Santo (500 VT kasem 1,000 VT).',
    presets: [
      'Tanoliu Village',
      'Havannah Harbour (Wahoo Bar / Gideon)',
      'Siviri & Cave',
      'Paunangisu Wharf (Boat to Nguna/Pele)',
      'Epau & Pangpang',
      'Eton Beach & Blue Lagoon',
      'Rentapao River',
      'Marona & Baie Ternay',
      'South Santo & Million Dollar Point',
      'Champagne Beach & Port Olry (Santo)',
    ],
  },
];

/**
 * Determines which zone a location belongs to.
 */
export function detectZone(location: string): TransportZone {
  const loc = (location || '').toLowerCase();

  for (const zone of REGULATED_ZONES) {
    for (const preset of zone.presets) {
      if (loc.includes(preset.toLowerCase()) || preset.toLowerCase().includes(loc)) {
        return zone;
      }
    }
  }

  // Keyword heuristics
  if (
    loc.includes('tanoliu') ||
    loc.includes('havannah') ||
    loc.includes('siviri') ||
    loc.includes('nguna') ||
    loc.includes('pele') ||
    loc.includes('eton') ||
    loc.includes('blue lagoon') ||
    loc.includes('ring road') ||
    loc.includes('epau') ||
    loc.includes('port olry') ||
    loc.includes('champagne')
  ) {
    return REGULATED_ZONES[2]; // Zone 3
  }

  if (
    loc.includes('mele') ||
    loc.includes('pango') ||
    loc.includes('teouma') ||
    loc.includes('klem') ||
    loc.includes('devil') ||
    loc.includes('erakor') ||
    loc.includes('airport') ||
    loc.includes('bladiniere')
  ) {
    return REGULATED_ZONES[1]; // Zone 2
  }

  // Default to Urban Flat Rate
  return REGULATED_ZONES[0];
}

/**
 * Calculates standard regulated fare based on pickup, drop-off, vehicle type and seats.
 */
export function calculateRegulatedFare(
  pickup: string,
  dropoff: string,
  vehicleType: 'BUS' | 'MINIBUS' | 'TAXI' | 'PUBLIC_TRANSPORT' = 'BUS',
  seats: number = 1,
): { fare: number; zone: TransportZone; unitFare: number; label: string } {
  const pZone = detectZone(pickup);
  const dZone = detectZone(dropoff);

  // Highest zone between pickup and dropoff dictates the rate band
  let activeZone = REGULATED_ZONES[0];
  if (pZone.id === 'ZONE_3' || dZone.id === 'ZONE_3') {
    activeZone = REGULATED_ZONES[2];
  } else if (pZone.id === 'ZONE_2' || dZone.id === 'ZONE_2') {
    activeZone = REGULATED_ZONES[1];
  }

  const safeSeats = Math.max(1, seats || 1);

  if (vehicleType === 'TAXI') {
    const taxiFare = activeZone.taxiMinFare;
    return {
      fare: taxiFare,
      unitFare: taxiFare,
      zone: activeZone,
      label: `${activeZone.nameBi} • Taksi Fia: ${taxiFare} VT`,
    };
  }

  const unitFare = activeZone.busFare;
  const total = unitFare * safeSeats;

  return {
    fare: total,
    unitFare,
    zone: activeZone,
    label: `${activeZone.nameBi} • ${unitFare} VT / pasenja`,
  };
}

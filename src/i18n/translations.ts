export type SupportedLanguage = 'bi' | 'en' | 'fr';

export const TRANSLATIONS = {
  bi: {
    // App Brand
    appName: 'Vanuatu Smart Transport',
    tagline: 'Sistem blong transpot long Vanuatu',
    countryTag: '🇻🇺 Vanuatu',

    // Nav & Common
    home: 'Hom',
    myBookings: 'Ol Buking blong mi',
    profile: 'Profael',
    trips: 'Ol Trip',
    dashboard: 'Dasebod',
    history: 'Stori blong trip',
    drivers: 'Ol Draeva',
    logout: 'Log Aot',
    cancel: 'Kansel',
    confirm: 'Konfemem',
    save: 'Sefem',
    close: 'Sat',
    back: 'Go Bak',
    loading: 'I stap lodem...',
    error: 'Problem i hapen',
    success: 'I gohed gud',
    ok: 'OK',

    // Offline & Connection
    offlineBanner: 'Offline Mode: Yu stap long ded zon we netwok i no gat. Data we yu luk ya i sef finis long fon.',
    offlineNotice: 'I no gat intanet',
    sendViaSms: 'Senn Buking tru long SMS',
    smsSentPrompt: 'Mesij blong SMS i redi long fon blong yu!',

    // Greetings & Header
    greeting: 'Halo olketa,',
    heroLive: 'LIVE ISLAND TRANSPOR',
    heroTitle: 'Bas, Taksi & Pablik Transpot',
    heroSub: 'Lukaotem rod we i stap ron naoia o bukem wan drayva',
    searchPlaceholder: 'Lukaotem ples, maket, wof, o namba blong plet...',

    // Categories
    catAll: 'Evri Transpot',
    catTaxi: 'Taksi (Haerem)',
    catPublic: 'Pablik Transpot',
    catBus: 'Ol Bas',

    // Available Services
    availableNow: 'Taksi & Transpot we i Redi Naoia',
    callDriver: 'Kolem',
    bookDirect: 'Bukem Naoia',
    fromFare: 'Stat long',
    noServices: 'I no gat drayva we i redi naoia.',

    // Scheduled Trips
    scheduledTripsTitle: 'Ol Bas we oli Stap Ron',
    tapToTrack: 'Tajem eni bas blong luk taem we bae i kasem yu',
    noTrips: 'I no gat bas we i skedul long rod ya yet.',
    enRoute: 'STAP RON',
    scheduled: 'SKEDUL',
    departure: 'PLES BLONG STAT',
    destination: 'PLES WE BAE I KASEM',
    arrivingIn: 'Bae i kasem yu long ~{min} minit',
    tripDuration: '~{min} minit trip',
    availableSeats: '{open} long {total} ples i stap yet',
    farePerSeat: '{fare} VT / pasenja',

    // Booking Modal
    bookTransport: 'Buk Transpot',
    pickupLocation: 'Ples we bae drayva i pikimap yu',
    dropoffLocation: 'Ples we bae yu godaon long hem',
    passengerCount: 'Namba blong pasenja',
    cargoNotes: 'Kago o samting we yu karem (optional)',
    regulatedFareNotice: 'Ofisel Fia we Loa i talem:',
    totalFare: 'Fia we bae yu pem:',
    submitBooking: 'Konfemem & Bukem Naoia',
    submitting: 'I stap senn...',

    // Regulated Zones
    zoneUrban: 'Taon Fea (Port Vila / Luganville)',
    zoneSuburban: 'Zon 2 (Klosap long Taon & Turis Ples)',
    zoneRural: 'Zon 3 (Ring Rod blong Efate & Aelan)',
    zoneUrbanRate: '150 VT / pasenja',
    zoneSuburbanRate: '250 VT / pasenja',
    zoneRuralRate: '500 VT - 1,000 VT',

    // Safety & SOS
    sosButton: '🚨 SOS / Emagensi',
    emergencyTitle: 'Emagensi & Sekuriti Kwiktaem',
    emergencySubtitle: 'Sipus wan denja i stap, tajem wan blong olgeta namba ya kwiktaem:',
    callPolice: 'Kolem Polis blong Vanuatu (111)',
    callPoliceDirect: 'Kolem Port Vila Polis (22222)',
    callAmbulance: 'Kolem Promedical Ambulans (115)',
    sendSosSms: 'Senn Emagensi SMS wetem GPS Lokesen',
    sosSmsPrepared: 'Emagensi SMS i redi wetem namba blong plet mo Google Maps link blong yu!',

    // Incident Reporting
    reportIncident: 'Ripoti Wan Problem',
    reportIncidentTitle: 'Ripoti Wan Drayva o Trak',
    reportSubtitle: 'Toksave i go stret long Polis o Transpot Otoriti blong Vanuatu',
    incidentCategory: 'Kategori blong problem',
    catOvercharging: 'Peeman i bitim mak (Overcharging)',
    catReckless: 'Drayva i ron tumas / kaban (Reckless driving)',
    catUnlicensed: 'Plet o laesens i no stret (Unlicensed/fake plate)',
    catHarassment: 'Tok kros o sefti problem (Harassment/Safety)',
    catCondition: 'Kondisen blong trak i nogud (Broken/Unsafe vehicle)',
    catOther: 'Nara problem (Other)',
    vehiclePlate: 'Namba blong Plet blong trak (e.g. B 1245 o T 300)',
    driverName: 'Nem blong drayva (sipos yu save)',
    incidentLocation: 'Ples we problem ya i hapen',
    incidentDetails: 'Eksplenem wanem we i hapen...',
    submitReport: 'Senn Ripoti i Go',
    reportSuccess: 'Tankyu tumas. Ripoti blong yu i go finis long Otoriti.',

    // Ratings & Reviews
    rateDriverTitle: 'Givim Mak long Drayva',
    rateDriverSub: 'Hao nao drayva ya i draeva mo mekem sefti blong yu?',
    starRating: '{stars} Sta',
    tagSafe: '🛡️ Gudfala & Seft drayva',
    tagClean: '✨ Trak i klin',
    tagFair: '💰 Fia i stret (No overcharge)',
    tagPunctual: '⏱️ I no mekem mi wet longtaem',
    reviewCommentPlaceholder: 'Raitim wan smol toktok blong helpem narafala pasenja...',
    submitRating: 'Sefem Mak ya',
    ratingSuccess: 'Tankyu tumas long mak we yu givim!',

    // Driver Specific
    availabilityStatus: 'Status blong yu',
    readyForPassengers: 'I redi blong karem pasenja',
    onATrip: 'Stap insaed long wan trip',
    offlineStatus: 'No stap wok naoia',
    createTripTitle: 'Mekem Wan Niu Bus Trip',
    selectZone: 'Pikimap Fia blong Zon',
  },

  en: {
    // App Brand
    appName: 'Vanuatu Smart Transport',
    tagline: 'Public & private transport across Vanuatu',
    countryTag: '🇻🇺 Vanuatu',

    // Nav & Common
    home: 'Home',
    myBookings: 'My Bookings',
    profile: 'Profile',
    trips: 'Trips',
    dashboard: 'Dashboard',
    history: 'Trip History',
    drivers: 'Drivers',
    logout: 'Log Out',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Successful',
    ok: 'OK',

    // Offline & Connection
    offlineBanner: 'Offline Mode: You are in a low/no network coverage area. Data displayed is cached from your last sync.',
    offlineNotice: 'No Internet Connection',
    sendViaSms: 'Send Booking via SMS',
    smsSentPrompt: 'SMS booking message is ready in your phone messenger!',

    // Greetings & Header
    greeting: 'Hello,',
    heroLive: 'LIVE ISLAND TRANSPORT',
    heroTitle: 'Buses, Taxis & Public Transport',
    heroSub: 'Track active island routes or book available drivers directly',
    searchPlaceholder: 'Search destination, market, wharf, or plate...',

    // Categories
    catAll: 'All Transport',
    catTaxi: 'Taxis (Hire)',
    catPublic: 'Public Transport',
    catBus: 'Buses',

    // Available Services
    availableNow: 'Taxis & Transport Available Now',
    callDriver: 'Call',
    bookDirect: 'Book Now',
    fromFare: 'From',
    noServices: 'No drivers are currently available.',

    // Scheduled Trips
    scheduledTripsTitle: 'Scheduled Bus Routes',
    tapToTrack: 'Tap any vehicle to view real-time arrival progress',
    noTrips: 'No active bus trips found for this route.',
    enRoute: 'EN ROUTE',
    scheduled: 'SCHEDULED',
    departure: 'DEPARTURE',
    destination: 'DESTINATION',
    arrivingIn: 'Arriving in ~{min} min',
    tripDuration: '~{min} min trip',
    availableSeats: '{open} of {total} seats open',
    farePerSeat: '{fare} VT / seat',

    // Booking Modal
    bookTransport: 'Book Transport',
    pickupLocation: 'Pickup Location',
    dropoffLocation: 'Drop-off Destination',
    passengerCount: 'Number of Passengers',
    cargoNotes: 'Cargo / produce notes (optional)',
    regulatedFareNotice: 'Regulated Official Fare:',
    totalFare: 'Total Fare:',
    submitBooking: 'Confirm & Book Now',
    submitting: 'Submitting...',

    // Regulated Zones
    zoneUrban: 'Urban Town Rate (Port Vila / Luganville)',
    zoneSuburban: 'Zone 2 (Suburban & Attractions)',
    zoneRural: 'Zone 3 (Rural Efate & Ring Road)',
    zoneUrbanRate: '150 VT / seat',
    zoneSuburbanRate: '250 VT / seat',
    zoneRuralRate: '500 VT - 1,000 VT',

    // Safety & SOS
    sosButton: '🚨 SOS / Emergency',
    emergencyTitle: 'Emergency & Safety Dispatch',
    emergencySubtitle: 'If you are in danger or need immediate help, tap any emergency service:',
    callPolice: 'Call Vanuatu Police Force (111)',
    callPoliceDirect: 'Call Port Vila Police Station (22222)',
    callAmbulance: 'Call Promedical Ambulance (115)',
    sendSosSms: 'Send Emergency SOS SMS with GPS Location',
    sosSmsPrepared: 'Emergency SMS prepared with plate number and Google Maps link!',

    // Incident Reporting
    reportIncident: 'Report Incident',
    reportIncidentTitle: 'Report Driver or Vehicle',
    reportSubtitle: 'Direct report dispatched to Police and Transport Authority',
    incidentCategory: 'Incident Category',
    catOvercharging: 'Overcharging (Price above regulated fare)',
    catReckless: 'Reckless or dangerous driving',
    catUnlicensed: 'Unlicensed vehicle or fake plate',
    catHarassment: 'Harassment / Safety concern',
    catCondition: 'Unsafe or broken vehicle condition',
    catOther: 'Other complaint',
    vehiclePlate: 'Vehicle Plate Number (e.g. B 1245 or T 300)',
    driverName: 'Driver Name (if known)',
    incidentLocation: 'Where did this happen?',
    incidentDetails: 'Describe what happened in detail...',
    submitReport: 'Submit Incident Report',
    reportSuccess: 'Thank you. Your report has been dispatched to authorities.',

    // Ratings & Reviews
    rateDriverTitle: 'Rate Your Driver',
    rateDriverSub: 'How was your driver\'s safety, courtesy, and vehicle condition?',
    starRating: '{stars} Stars',
    tagSafe: '🛡️ Safe & careful driving',
    tagClean: '✨ Clean vehicle',
    tagFair: '💰 Fair regulated fare',
    tagPunctual: '⏱️ On-time arrival',
    reviewCommentPlaceholder: 'Write a quick review to help other island passengers...',
    submitRating: 'Submit Review',
    ratingSuccess: 'Thank you for rating your driver!',

    // Driver Specific
    availabilityStatus: 'Your Availability Status',
    readyForPassengers: 'Available for Passengers',
    onATrip: 'Currently on a Trip',
    offlineStatus: 'Not Available',
    createTripTitle: 'Create New Bus Route Trip',
    selectZone: 'Select Zone Fare Preset',
  },

  fr: {
    // App Brand
    appName: 'Vanuatu Smart Transport',
    tagline: 'Système de transport public et privé du Vanuatu',
    countryTag: '🇻🇺 Vanuatu',

    // Nav & Common
    home: 'Accueil',
    myBookings: 'Mes Réservations',
    profile: 'Profil',
    trips: 'Trajets',
    dashboard: 'Tableau de bord',
    history: 'Historique',
    drivers: 'Chauffeurs',
    logout: 'Déconnexion',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    close: 'Fermer',
    back: 'Retour',
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    success: 'Opération réussie',
    ok: 'OK',

    // Offline & Connection
    offlineBanner: 'Mode Hors-ligne : Vous êtes en zone blanche. Les données affichées proviennent du cache local.',
    offlineNotice: 'Pas de connexion Internet',
    sendViaSms: 'Envoyer la réservation par SMS',
    smsSentPrompt: 'Le SMS de réservation est prêt dans votre messagerie !',

    // Greetings & Header
    greeting: 'Bonjour,',
    heroLive: 'TRANSPORT EN DIRECT',
    heroTitle: 'Bus, Taxis & Transport Public',
    heroSub: 'Suivez les itinéraires ou réservez un chauffeur disponible',
    searchPlaceholder: 'Rechercher destination, marché, quai ou plaque...',

    // Categories
    catAll: 'Tous',
    catTaxi: 'Taxis',
    catPublic: 'Transport Public',
    catBus: 'Bus',

    // Available Services
    availableNow: 'Taxis & Transports Disponibles',
    callDriver: 'Appeler',
    bookDirect: 'Réserver',
    fromFare: 'À partir de',
    noServices: 'Aucun chauffeur disponible actuellement.',

    // Scheduled Trips
    scheduledTripsTitle: 'Lignes de Bus Programmées',
    tapToTrack: 'Touchez un véhicule pour suivre son arrivée en direct',
    noTrips: 'Aucun trajet de bus actif pour cet itinéraire.',
    enRoute: 'EN ROUTE',
    scheduled: 'PROGRAMMÉ',
    departure: 'DÉPART',
    destination: 'ARRIVÉE',
    arrivingIn: 'Arrivée dans ~{min} min',
    tripDuration: 'Trajet de ~{min} min',
    availableSeats: '{open} sur {total} places libres',
    farePerSeat: '{fare} VT / passager',

    // Booking Modal
    bookTransport: 'Réserver un Transport',
    pickupLocation: 'Lieu de prise en charge',
    dropoffLocation: 'Lieu de dépose',
    passengerCount: 'Nombre de passagers',
    cargoNotes: 'Bagages ou marchandises (optionnel)',
    regulatedFareNotice: 'Tarif officiel réglementé :',
    totalFare: 'Tarif total :',
    submitBooking: 'Confirmer la réservation',
    submitting: 'Envoi en cours...',

    // Regulated Zones
    zoneUrban: 'Tarif Urbain (Port-Vila / Luganville)',
    zoneSuburban: 'Zone 2 (Périurbain & Tourisme)',
    zoneRural: 'Zone 3 (Efate Rurale & Grande Route)',
    zoneUrbanRate: '150 VT / passager',
    zoneSuburbanRate: '250 VT / passager',
    zoneRuralRate: '500 VT - 1 000 VT',

    // Safety & SOS
    sosButton: '🚨 SOS / Urgence',
    emergencyTitle: 'Secours & Sécurité d\'Urgence',
    emergencySubtitle: 'En cas de danger immédiat, composez un numéro d\'urgence :',
    callPolice: 'Police du Vanuatu (111)',
    callPoliceDirect: 'Commissariat de Port-Vila (22222)',
    callAmbulance: 'Ambulance Promedical (115)',
    sendSosSms: 'Envoyer SMS d\'Urgence avec Position GPS',
    sosSmsPrepared: 'SMS d\'urgence préparé avec la plaque et lien Google Maps !',

    // Incident Reporting
    reportIncident: 'Signaler un problème',
    reportIncidentTitle: 'Signaler un chauffeur ou véhicule',
    reportSubtitle: 'Rapport transmis directement à la Police et aux autorités',
    incidentCategory: 'Type d\'incident',
    catOvercharging: 'Tarif abusif (dépassement tarif légal)',
    catReckless: 'Conduite dangereuse ou excès de vitesse',
    catUnlicensed: 'Véhicule non immatriculé / fausse plaque',
    catHarassment: 'Harcèlement / problème de sécurité',
    catCondition: 'Véhicule défectueux ou dangereux',
    catOther: 'Autre motif',
    vehiclePlate: 'Plaque d\'immatriculation (ex. B 1245 ou T 300)',
    driverName: 'Nom du chauffeur (si connu)',
    incidentLocation: 'Lieu de l\'incident',
    incidentDetails: 'Décrivez ce qui s\'est passé...',
    submitReport: 'Envoyer le signalement',
    reportSuccess: 'Merci. Votre signalement a été transmis aux autorités.',

    // Ratings & Reviews
    rateDriverTitle: 'Évaluer votre chauffeur',
    rateDriverSub: 'Comment évaluez-vous la sécurité et la courtoisie ?',
    starRating: '{stars} Étoiles',
    tagSafe: '🛡️ Conduite sûre et prudente',
    tagClean: '✨ Véhicule propre',
    tagFair: '💰 Tarif réglementé respecté',
    tagPunctual: '⏱️ Ponctuel',
    reviewCommentPlaceholder: 'Laissez un commentaire pour aider les autres usagers...',
    submitRating: 'Enregistrer l\'évaluation',
    ratingSuccess: 'Merci pour votre évaluation !',

    // Driver Specific
    availabilityStatus: 'Votre disponibilité',
    readyForPassengers: 'Prêt à prendre des passagers',
    onATrip: 'En cours de course',
    offlineStatus: 'Non disponible',
    createTripTitle: 'Créer un nouveau trajet en bus',
    selectZone: 'Sélectionner la zone tarifaire',
  },
};

export interface Property {
  id: string;
  name: string;
  location: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRateTND: number;
  status: 'Occupied' | 'Available' | 'Cleaning' | 'Maintenance';
  imageUrl: string;
  rating: number;
  wifiSSID: string;
  wifiPass: string;
  doorCode: string;
  checkInTime: string;
  checkOutTime: string;
  trashSchedule: string;
  houseRules: string[];
  emergencyContact: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  channel: 'Airbnb' | 'Booking.com' | 'Direct' | 'VRBO';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalTND: number;
  status: 'Confirmed' | 'Pending' | 'Checked-In' | 'Checked-Out' | 'Conflict';
  guestsCount: number;
  conflictNotes?: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'guest' | 'ai' | 'staff';
  senderName: string;
  text: string;
  timestamp: string;
  confidenceScore?: number;
}

export interface Conversation {
  id: string;
  guestName: string;
  propertyId: string;
  propertyName: string;
  channel: 'Airbnb' | 'Booking.com' | 'Direct' | 'VRBO';
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  status: 'ai_handled' | 'human_action_required' | 'staff_took_over';
  aiMode: boolean; // true = chatbot simulator active, false = human takeover
  messages: ConversationMessage[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  propertyId: string;
  propertyName: string;
  category: 'Maintenance' | 'Housekeeping' | 'Guest Request' | 'Urgent';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved';
  assignedTo?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Ops Manager' | 'Housekeeping Lead' | 'Maintenance Tech';
  status: 'Active' | 'On Leave';
  avatarUrl: string;
}

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'Villa Yasmine',
    location: 'Jasmin Zone, Hammamet',
    city: 'Hammamet',
    bedrooms: 4,
    bathrooms: 3.5,
    maxGuests: 8,
    nightlyRateTND: 650,
    status: 'Occupied',
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    rating: 4.95,
    wifiSSID: 'VillaYasmine_5G_Guests',
    wifiPass: 'HammametBeach2026!',
    doorCode: '4829#',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    trashSchedule: 'Tuesday & Friday evenings (Bins outside main gate)',
    houseRules: [
      'No loud music outside after 22:00 per local Hammamet noise ordinance',
      'Pool pump runs automatically 06:00 - 10:00. Please do not turn off main switch',
      'Water conservation policy: Turn off garden hose when not in use',
      'No smoking indoors (designated area near outdoor terrace olive tree)'
    ],
    emergencyContact: '+216 98 420 112 (Amira Mansour - Ops Manager)'
  },
  {
    id: 'prop-2',
    name: 'Dar El Bey',
    location: 'Upper Cliff Street, Sidi Bou Said',
    city: 'Sidi Bou Said',
    bedrooms: 3,
    bathrooms: 3,
    maxGuests: 6,
    nightlyRateTND: 820,
    status: 'Occupied',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    rating: 4.98,
    wifiSSID: 'DarElBey_Courtyard',
    wifiPass: 'AzureBlue2026',
    doorCode: '9102#',
    checkInTime: '15:00',
    checkOutTime: '10:30',
    trashSchedule: 'Daily municipal collection at 08:00 AM',
    houseRules: [
      'Historic Ottoman courtyard home: treat tilework and antique wood doors with care',
      'Rooftop terrace safety: supervision required for children',
      'Strictly no guest visits past midnight'
    ],
    emergencyContact: '+216 98 420 112 (Amira Mansour - Ops Manager)'
  },
  {
    id: 'prop-3',
    name: 'Apartment Carthage Horizon',
    location: 'Les Berges du Lac II, Tunis',
    city: 'Tunis',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    nightlyRateTND: 380,
    status: 'Available',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    rating: 4.88,
    wifiSSID: 'CarthageHorizon_Fibre',
    wifiPass: 'Lac2Suite2026',
    doorCode: '1574#',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    trashSchedule: 'Basement chute available 24/7',
    houseRules: [
      'Underground parking space #14 assigned to this suite',
      'Gym access card provided on kitchen counter'
    ],
    emergencyContact: '+216 22 104 990 (Amine Bouazizi - Tech Maintenance)'
  },
  {
    id: 'prop-4',
    name: 'Residence La Goulette Beachfront',
    location: 'Avenue Franklin Roosevelt, La Goulette',
    city: 'Tunis',
    bedrooms: 2,
    bathrooms: 1.5,
    maxGuests: 4,
    nightlyRateTND: 310,
    status: 'Cleaning',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    rating: 4.79,
    wifiSSID: 'LaGoulette_Beach5G',
    wifiPass: 'SeaSideGoulette',
    doorCode: '3321#',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    trashSchedule: 'Street bin next to Cafe Des Sports',
    houseRules: [
      'Rinse sand at ground-floor outdoor shower before entering main lobby',
      'Towels for beach use are tagged blue in hallway closet'
    ],
    emergencyContact: '+216 95 330 811 (Fatma Trabelsi - Housekeeping)'
  },
  {
    id: 'prop-5',
    name: 'Palm Villa Oasis',
    location: 'Midoun Tourist Zone, Djerba',
    city: 'Djerba',
    bedrooms: 5,
    bathrooms: 4,
    maxGuests: 10,
    nightlyRateTND: 950,
    status: 'Available',
    imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
    rating: 4.96,
    wifiSSID: 'DjerbaOasis_HighSpeed',
    wifiPass: 'PalmsAndSun2026',
    doorCode: '7723#',
    checkInTime: '16:00',
    checkOutTime: '11:00',
    trashSchedule: 'Outside gate collection Wednesday & Saturday',
    houseRules: [
      'Outdoor BBQ area must be extinguished after midnight',
      'Bicycle keys available in key box'
    ],
    emergencyContact: '+216 98 420 112 (Amira Mansour - Ops Manager)'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-101',
    propertyId: 'prop-1',
    propertyName: 'Villa Yasmine',
    guestName: 'Sarah Jenkins',
    guestEmail: 'sarah.j@travelers.uk',
    guestPhone: '+44 7700 900077',
    channel: 'Airbnb',
    startDate: '2026-07-20',
    endDate: '2026-07-26',
    totalTND: 3900,
    status: 'Checked-In',
    guestsCount: 5
  },
  {
    id: 'bk-102',
    propertyId: 'prop-1',
    propertyName: 'Villa Yasmine',
    guestName: 'Klaus Schmidt',
    guestEmail: 'kschmidt@berlin-mail.de',
    guestPhone: '+49 151 5550123',
    channel: 'Booking.com',
    startDate: '2026-07-25',
    endDate: '2026-07-30',
    totalTND: 3250,
    status: 'Conflict',
    guestsCount: 4,
    conflictNotes: 'ALERT: 1-day overlap with Airbnb booking (bk-101) on July 25-26. Manual resolution required!'
  },
  {
    id: 'bk-103',
    propertyId: 'prop-2',
    propertyName: 'Dar El Bey',
    guestName: 'Marie & Laurent Dupont',
    guestEmail: 'marie.dupont@paris-luxury.fr',
    guestPhone: '+33 6 12 34 56 78',
    channel: 'Direct',
    startDate: '2026-07-18',
    endDate: '2026-07-24',
    totalTND: 4920,
    status: 'Checked-In',
    guestsCount: 4
  },
  {
    id: 'bk-104',
    propertyId: 'prop-3',
    propertyName: 'Apartment Carthage Horizon',
    guestName: 'Tariq Ben Ammar',
    guestEmail: 'tariq.ammar@biz.tn',
    guestPhone: '+216 20 889 001',
    channel: 'Direct',
    startDate: '2026-07-22',
    endDate: '2026-07-25',
    totalTND: 1140,
    status: 'Confirmed',
    guestsCount: 2
  },
  {
    id: 'bk-105',
    propertyId: 'prop-4',
    propertyName: 'Residence La Goulette Beachfront',
    guestName: 'Elena Rostova',
    guestEmail: 'elena.rostova@nomad.io',
    guestPhone: '+34 611 223 344',
    channel: 'VRBO',
    startDate: '2026-07-21',
    endDate: '2026-07-28',
    totalTND: 2170,
    status: 'Confirmed',
    guestsCount: 3
  },
  {
    id: 'bk-106',
    propertyId: 'prop-5',
    propertyName: 'Palm Villa Oasis',
    guestName: 'Youssef & Leila Kallel',
    guestEmail: 'y.kallel@tech-hub.tn',
    guestPhone: '+216 98 112 334',
    channel: 'Airbnb',
    startDate: '2026-07-28',
    endDate: '2026-08-04',
    totalTND: 6650,
    status: 'Confirmed',
    guestsCount: 8
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    guestName: 'Sarah Jenkins',
    propertyId: 'prop-1',
    propertyName: 'Villa Yasmine, Hammamet',
    channel: 'Airbnb',
    lastMessage: 'Thank you! Is it possible to request an extra set of pool towels for tomorrow morning?',
    lastMessageTime: '10:42 AM',
    unread: true,
    status: 'ai_handled',
    aiMode: true,
    messages: [
      {
        id: 'msg-1',
        sender: 'guest',
        senderName: 'Sarah Jenkins',
        text: 'Hi there! We just arrived at Villa Yasmine. What is the WiFi password again?',
        timestamp: '10:30 AM'
      },
      {
        id: 'msg-2',
        sender: 'ai',
        senderName: 'Vayca Chatbot',
        text: 'Hello Sarah! Welcome to Villa Yasmine Hammamet. 🌴 Your WiFi network is "VillaYasmine_5G_Guests" and the password is "HammametBeach2026!". Let us know if you need anything else!',
        timestamp: '10:31 AM',
        confidenceScore: 0.98
      },
      {
        id: 'msg-3',
        sender: 'guest',
        senderName: 'Sarah Jenkins',
        text: 'Thank you! Is it possible to request an extra set of pool towels for tomorrow morning?',
        timestamp: '10:42 AM'
      }
    ]
  },
  {
    id: 'conv-2',
    guestName: 'Marie & Laurent Dupont',
    propertyId: 'prop-2',
    propertyName: 'Dar El Bey, Sidi Bou Said',
    channel: 'Direct',
    lastMessage: 'The hot water in the master bathroom courtyard suite seems lukewarm. Can someone inspect?',
    lastMessageTime: '09:15 AM',
    unread: true,
    status: 'human_action_required',
    aiMode: false,
    messages: [
      {
        id: 'msg-201',
        sender: 'guest',
        senderName: 'Marie Dupont',
        text: 'Good morning! We love the sea view from Dar El Bey.',
        timestamp: '09:00 AM'
      },
      {
        id: 'msg-202',
        sender: 'guest',
        senderName: 'Marie Dupont',
        text: 'The hot water in the master bathroom courtyard suite seems lukewarm. Can someone inspect?',
        timestamp: '09:15 AM'
      },
      {
        id: 'msg-203',
        sender: 'staff',
        senderName: 'Amira Mansour (Ops Lead)',
        text: 'Bonjour Marie! Our maintenance tech Amine is nearby in Sidi Bou Said and will check the water heater boiler unit in 20 minutes.',
        timestamp: '09:20 AM'
      }
    ]
  },
  {
    id: 'conv-3',
    guestName: 'Klaus Schmidt',
    propertyId: 'prop-1',
    propertyName: 'Villa Yasmine, Hammamet',
    channel: 'Booking.com',
    lastMessage: 'Can I confirm my check-in time for July 25th?',
    lastMessageTime: 'Yesterday',
    unread: false,
    status: 'human_action_required',
    aiMode: true,
    messages: [
      {
        id: 'msg-301',
        sender: 'guest',
        senderName: 'Klaus Schmidt',
        text: 'Can I confirm my check-in time for July 25th?',
        timestamp: 'Yesterday 18:20'
      },
      {
        id: 'msg-302',
        sender: 'ai',
        senderName: 'Vayca Chatbot',
        text: 'Hello Klaus, standard check-in for Villa Yasmine is 15:00. However, our team is currently flagging a booking calendar adjustment for your dates. An operations specialist will message you shortly!',
        timestamp: 'Yesterday 18:21',
        confidenceScore: 0.89
      }
    ]
  }
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tck-1',
    title: 'Water Heater Temperature Inspection',
    description: 'Master bathroom hot water reported lukewarm by guest Marie Dupont.',
    propertyId: 'prop-2',
    propertyName: 'Dar El Bey, Sidi Bou Said',
    category: 'Maintenance',
    priority: 'High',
    status: 'In Progress',
    assignedTo: 'Amine Bouazizi',
    createdAt: 'Today 09:25 AM'
  },
  {
    id: 'tck-2',
    title: 'Resolve Calendar Conflict (Jul 25-26)',
    description: 'Booking.com reservation overlap with Airbnb reservation for Villa Yasmine.',
    propertyId: 'prop-1',
    propertyName: 'Villa Yasmine, Hammamet',
    category: 'Urgent',
    priority: 'High',
    status: 'Open',
    assignedTo: 'Amira Mansour',
    createdAt: 'Today 08:00 AM'
  },
  {
    id: 'tck-3',
    title: 'Deliver Extra Pool Towels',
    description: 'Guest requested 4 additional luxury pool towels for morning swim.',
    propertyId: 'prop-1',
    propertyName: 'Villa Yasmine, Hammamet',
    category: 'Guest Request',
    priority: 'Medium',
    status: 'Assigned',
    assignedTo: 'Fatma Trabelsi',
    createdAt: 'Today 10:45 AM'
  },
  {
    id: 'tck-4',
    title: 'AC Filter Cleaning & Refill',
    description: 'Routine pre-summer AC overhaul and filter deep clean.',
    propertyId: 'prop-3',
    propertyName: 'Apartment Carthage Horizon',
    category: 'Maintenance',
    priority: 'Low',
    status: 'Resolved',
    assignedTo: 'Amine Bouazizi',
    createdAt: 'Yesterday'
  }
];

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Youssef Ben Salem',
    email: 'youssef@vayca.tn',
    role: 'Owner',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'user-2',
    name: 'Amira Mansour',
    email: 'amira@vayca.tn',
    role: 'Ops Manager',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'user-3',
    name: 'Fatma Trabelsi',
    email: 'fatma@vayca.tn',
    role: 'Housekeeping Lead',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'user-4',
    name: 'Amine Bouazizi',
    email: 'amine@vayca.tn',
    role: 'Maintenance Tech',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  }
];

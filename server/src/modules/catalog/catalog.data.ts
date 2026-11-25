export interface Product {
  id: string;
  /** Matches the item names in the sample orders every account gets. */
  name: string;
  category: string;
  tagline: string;
  description: string;
  price: number; // INR, whole rupees
  features: string[];
  warranty: string;
}

/** The demo catalog: the single source of truth for the storefront and for the assistant's product answers. */
export const PRODUCTS: Product[] = [
  {
    id: 'airdopes-141',
    name: 'boAt Airdopes 141 Earbuds',
    category: 'Earbuds',
    tagline: '42-hour playback with ENx noise cancellation.',
    description:
      'True wireless earbuds built for long days: up to 42 hours of total playback with the charging case, ENx noise cancellation for clearer calls, and fast charging that gives hours of music from a short top-up.',
    price: 1499,
    features: [
      'Up to 42 hours of total playback with the case',
      'ENx noise cancellation for clearer calls',
      'ASAP fast charge',
      'Low-latency Beast Mode for gaming',
      'IPX4 splash and sweat resistance',
      'Bluetooth 5.1',
    ],
    warranty: '1 year',
  },
  {
    id: 'mi-power-bank-20000',
    name: 'Mi Power Bank 20000mAh',
    category: 'Power banks',
    tagline: 'Fast charging for two devices at once.',
    description:
      'A high-capacity power bank that keeps a phone going for days and can charge two devices at the same time, with multi-layer protection for safe charging.',
    price: 1799,
    features: ['20,000mAh capacity', '18W fast charging', 'Dual USB output', 'USB-C and micro-USB input', 'Multi-layer safety protection'],
    warranty: '1 year',
  },
  {
    id: 'noise-colorfit',
    name: 'Noise ColorFit Smartwatch',
    category: 'Smartwatches',
    tagline: 'AMOLED display, heart-rate and sleep tracking.',
    description:
      'A bright AMOLED smartwatch that tracks your heart rate, sleep and workouts, and shows call and message alerts on your wrist.',
    price: 2999,
    features: ['Bright AMOLED display', 'Heart-rate and sleep tracking', 'Multiple sports modes', 'Call and message alerts', 'Up to 7 days of battery on a charge'],
    warranty: '1 year',
  },
  {
    id: 'logitech-m331',
    name: 'Logitech M331 Silent Mouse',
    category: 'Mouse & keyboards',
    tagline: 'Silent clicks, 24-month battery life.',
    description:
      'A quiet wireless mouse for work and study: clicks are about 90% quieter, it connects with a tiny USB receiver, and a single battery lasts up to two years.',
    price: 899,
    features: ['About 90% quieter clicks', '2.4 GHz wireless with a USB receiver', 'Up to 24 months of battery life', 'Comfortable right-hand shape', '1000 DPI optical tracking'],
    warranty: '1 year',
  },
  {
    id: 'mini-speaker-10w',
    name: 'Mini Bluetooth Speaker 10W',
    category: 'Speakers',
    tagline: 'Pocket-sized, 12 hours of music.',
    description: 'A compact Bluetooth speaker with surprisingly full 10W sound, small enough for a bag and with enough battery for a full day out.',
    price: 1299,
    features: ['10W output', 'Up to 12 hours of playback', 'Bluetooth 5.0', 'Built-in microphone for calls', 'Pocket-sized'],
    warranty: '1 year',
  },
  {
    id: 'usb-c-cable-1m',
    name: 'USB-C Charging Cable 1m',
    category: 'Cables & chargers',
    tagline: 'Braided, 60W fast-charge ready.',
    description: 'A durable braided USB-C to USB-C cable that supports fast charging up to 60W and data transfer.',
    price: 299,
    features: ['1 metre braided nylon', 'Supports up to 60W charging', 'USB-C to USB-C', 'Data transfer up to 480Mbps'],
    warranty: '6 months',
  },
];

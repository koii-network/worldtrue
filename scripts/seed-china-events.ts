import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

// Create a connection pool with SSL for NeonDB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool, { schema });
const { events, users } = schema;

const chinaEvents = [
  {
    title: "British East India Company Opium Monopoly",
    description: "The EIC establishes monopoly over Bengal opium production, systematically cultivating and exporting opium to China despite Qing prohibition, creating widespread addiction.",
    lat: "25.5941",
    lng: "85.1376",
    year: 1773,
    eventType: "political" as const,
    country: "India",
    city: "Patna",
    tags: ["opium", "british empire", "east india company", "trade"],
  },
  {
    title: "Lin Zexu Destroys Opium at Humen",
    description: "Imperial Commissioner Lin Zexu publicly destroys 1.2 million kg of confiscated British opium over 23 days, triggering diplomatic crisis and eventual war with Britain.",
    lat: "22.8167",
    lng: "113.6667",
    year: 1839,
    eventType: "political" as const,
    country: "China",
    city: "Humen",
    tags: ["opium", "lin zexu", "qing dynasty", "drug destruction"],
  },
  {
    title: "First Opium War Begins",
    description: "Britain declares war on Qing China after Commissioner Lin Zexu destroys 20,000 chests of British opium in Canton. The war would force China to open ports to British trade and cede Hong Kong.",
    lat: "23.1291",
    lng: "113.2644",
    year: 1839,
    eventType: "conflict" as const,
    country: "China",
    city: "Guangzhou",
    tags: ["opium war", "british empire", "qing dynasty", "century of humiliation"],
  },
  {
    title: "Treaty of Nanking",
    description: "First of the 'unequal treaties' ending the First Opium War. China cedes Hong Kong to Britain, opens five treaty ports, and pays 21 million silver dollars in reparations.",
    lat: "32.0603",
    lng: "118.7969",
    year: 1842,
    eventType: "political" as const,
    country: "China",
    city: "Nanjing",
    tags: ["treaty", "unequal treaties", "hong kong", "century of humiliation"],
  },
  {
    title: "Taiping Rebellion Begins",
    description: "Hong Xiuquan leads a massive uprising against the Qing dynasty, partly fueled by social instability from opium addiction and foreign incursions. Would claim 20-30 million lives.",
    lat: "24.4803",
    lng: "118.0894",
    year: 1850,
    eventType: "conflict" as const,
    country: "China",
    city: "Jintian",
    tags: ["taiping", "rebellion", "civil war", "qing dynasty"],
  },
  {
    title: "Second Opium War Begins",
    description: "Britain and France attack China after the Arrow Incident. The war would result in further concessions, legalization of opium trade, and opening of additional ports.",
    lat: "23.1291",
    lng: "113.2644",
    year: 1856,
    eventType: "conflict" as const,
    country: "China",
    city: "Guangzhou",
    tags: ["opium war", "arrow incident", "british empire", "france"],
  },
  {
    title: "Treaty of Tientsin",
    description: "Unequal treaty opening 10 more Chinese ports to Western trade, legalizing the opium trade, permitting foreign ships on the Yangtze, and allowing Christian missionaries into China.",
    lat: "39.0842",
    lng: "117.2009",
    year: 1858,
    eventType: "political" as const,
    country: "China",
    city: "Tianjin",
    tags: ["treaty", "unequal treaties", "opium legalization", "missionaries"],
  },
  {
    title: "Burning of the Old Summer Palace",
    description: "British and French troops loot and destroy the Yuanmingyuan (Old Summer Palace) in retaliation for the torture of diplomats. One of the most devastating cultural losses in Chinese history.",
    lat: "40.0089",
    lng: "116.2983",
    year: 1860,
    eventType: "conflict" as const,
    country: "China",
    city: "Beijing",
    tags: ["yuanmingyuan", "cultural destruction", "looting", "british empire"],
  },
  {
    title: "Convention of Peking",
    description: "Treaty ending Second Opium War. China cedes Kowloon Peninsula to Britain, opens Tianjin as treaty port, legalizes opium trade, and allows foreign missionaries throughout China.",
    lat: "39.9042",
    lng: "116.4074",
    year: 1860,
    eventType: "political" as const,
    country: "China",
    city: "Beijing",
    tags: ["treaty", "kowloon", "opium legalization", "century of humiliation"],
  },
  {
    title: "Boxer Rebellion",
    description: "Anti-foreign, anti-Christian uprising by the 'Righteous Harmony Society.' Eight-nation alliance including Britain crushes the rebellion, leading to further indemnities and humiliation.",
    lat: "39.9042",
    lng: "116.4074",
    year: 1900,
    eventType: "conflict" as const,
    country: "China",
    city: "Beijing",
    tags: ["boxer rebellion", "eight nation alliance", "anti-imperialism", "siege of legations"],
  },
];

async function seedChinaEvents() {
  console.log('Seeding China Century of Humiliation events...');

  // Get or create a system user for seeding
  let systemUser = await db.query.users.findFirst({
    where: eq(users.username, 'system'),
  });

  if (!systemUser) {
    console.log('Creating system user...');
    const [newUser] = await db.insert(users).values({
      username: 'system',
      email: 'system@worldtrue.app',
      name: 'System',
      role: 'admin',
    }).returning();
    systemUser = newUser;
  }

  console.log(`Using user: ${systemUser.username} (${systemUser.id})`);

  for (const event of chinaEvents) {
    try {
      const [created] = await db.insert(events).values({
        title: event.title,
        description: event.description,
        lat: event.lat,
        lng: event.lng,
        year: event.year,
        eventType: event.eventType,
        country: event.country,
        city: event.city,
        tags: event.tags,
        createdBy: systemUser.id,
        importance: 8,
        verificationStatus: 'verified',
      }).returning();

      console.log(`✓ Created: ${created.title} (${created.year})`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log(`- Skipped (duplicate): ${event.title}`);
      } else {
        console.error(`✗ Failed: ${event.title}`, error.message);
      }
    }
  }

  console.log('\nDone!');
  await pool.end();
  process.exit(0);
}

seedChinaEvents().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed data.
 *
 * Credentials come from environment variables with development-only
 * fallbacks — no production credential is ever hard-coded here. Prices are
 * integer minor units (cents), matching the rest of the system.
 */
const products = [
  {
    name: 'Aurora Wireless Headphones',
    slug: 'aurora-wireless-headphones',
    description:
      'Reference-grade over-ear headphones with adaptive noise cancellation, 40-hour battery life and a machined aluminium frame. Tuned by hand for a neutral, uncoloured response that holds up across long listening sessions.',
    priceCents: 34_900,
    currency: 'usd',
    imageUrl: '/products/aurora-headphones.svg',
    category: 'Audio',
    stock: 42,
  },
  {
    name: 'Meridian Mechanical Keyboard',
    slug: 'meridian-mechanical-keyboard',
    description:
      'A 75% mechanical keyboard with a gasket-mounted aluminium chassis, hot-swappable switches and dye-sublimated PBT keycaps. Weighted to stay planted, damped to stay quiet.',
    priceCents: 21_900,
    currency: 'usd',
    imageUrl: '/products/meridian-keyboard.svg',
    category: 'Workspace',
    stock: 65,
  },
  {
    name: 'Lumen Desk Lamp',
    slug: 'lumen-desk-lamp',
    description:
      'Architect-style task lamp with a full-spectrum CRI 97 LED array, stepless dimming and a counterweighted arm that holds any position without drift. Finished in powder-coated steel.',
    priceCents: 12_900,
    currency: 'usd',
    imageUrl: '/products/lumen-lamp.svg',
    category: 'Lighting',
    stock: 80,
  },
  {
    name: 'Atlas Leather Backpack',
    slug: 'atlas-leather-backpack',
    description:
      'Full-grain vegetable-tanned leather backpack with a padded 16-inch laptop compartment, solid brass hardware and hand-stitched stress points. Ages into a patina that is entirely your own.',
    priceCents: 28_500,
    currency: 'usd',
    imageUrl: '/products/atlas-backpack.svg',
    category: 'Accessories',
    stock: 23,
  },
  {
    name: 'Nimbus Ceramic Pour-Over',
    slug: 'nimbus-ceramic-pour-over',
    description:
      'Hand-thrown stoneware pour-over set with a tapered 60-degree cone and spiral ribbing for an even extraction. Includes a 600 ml carafe and a reusable stainless filter.',
    priceCents: 7_400,
    currency: 'usd',
    imageUrl: '/products/nimbus-pourover.svg',
    category: 'Home',
    stock: 110,
  },
  {
    name: 'Vertex Studio Monitor',
    slug: 'vertex-studio-monitor',
    description:
      'A 27-inch 4K studio display covering 99% of DCI-P3, factory calibrated to Delta-E under 2. Single-cable USB-C with 90 W passthrough and a height-adjustable stand.',
    priceCents: 89_900,
    currency: 'usd',
    imageUrl: '/products/vertex-monitor.svg',
    category: 'Workspace',
    stock: 14,
  },
] as const;

const main = async (): Promise<void> => {
  console.log('Seeding NOVA MARKET...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@novamarket.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!change';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Nova Admin';
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? 'customer@novamarket.test';
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer123!';

  const [adminHash, customerHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(customerPassword, 12),
  ]);

  // Upserts keep the seed idempotent — it can be re-run safely.
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
    create: { name: adminName, email: adminEmail, passwordHash: adminHash, role: Role.ADMIN },
  });

  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      name: 'Sample Customer',
      email: customerEmail,
      passwordHash: customerHash,
      role: Role.CUSTOMER,
    },
  });

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { ...product },
      create: { ...product },
    });
  }

  console.log(`  admin:    ${admin.email}`);
  console.log(`  customer: ${customer.email}`);
  console.log(`  products: ${products.length}`);
  console.log('Seed complete.');
};

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

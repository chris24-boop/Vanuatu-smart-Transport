import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma.service';

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@midriver.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed the administrator.');
  }
  if (!password || password.length < 12) {
    throw new Error('Set ADMIN_PASSWORD to a unique password of at least 12 characters.');
  }
  if (!phone) {
    throw new Error('ADMIN_PHONE is required to seed the administrator.');
  }

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const existingPhoneUser = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingPhoneUser && existingPhoneUser.email !== email) {
      await prisma.user.delete({ where: { id: existingPhoneUser.id } });
    }

    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    const passwordHash = await bcrypt.hash(password, 12);

    if (existingEmailUser) {
      await prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          phone,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          firstName: 'Transport',
          lastName: 'Administrator',
        },
      });
    } else {
      await prisma.user.create({
        data: {
          firstName: 'Transport',
          lastName: 'Administrator',
          phone,
          email,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    }

    console.log(`Administrator account seeded for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error('Administrator seed failed:', error);
  process.exitCode = 1;
});
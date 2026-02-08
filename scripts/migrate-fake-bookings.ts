/**
 * Migration script: convert fake "Зайнято" bookings into TimeBlock records
 * and clean up the "-" phone Client entries.
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-fake-bookings.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Find all fake bookings
  const fakeBookings = await prisma.booking.findMany({
    where: {
      OR: [
        { clientName: 'Зайнято' },
        { clientPhone: '-' },
      ]
    },
    select: {
      id: true,
      salonId: true,
      masterId: true,
      date: true,
      time: true,
      timeEnd: true,
      duration: true,
      serviceName: true,
    }
  });

  console.log(`Found ${fakeBookings.length} fake bookings to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const booking of fakeBookings) {
    // Calculate endTime
    const endTime = booking.timeEnd || (() => {
      const [h, m] = booking.time.split(':').map(Number);
      const endMin = h * 60 + m + booking.duration;
      return `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;
    })();

    // Check if TimeBlock already exists for this slot
    const existing = await prisma.timeBlock.findFirst({
      where: {
        masterId: booking.masterId,
        date: booking.date,
        startTime: booking.time,
        endTime,
      }
    });

    if (existing) {
      skipped++;
    } else {
      // Create TimeBlock
      await prisma.timeBlock.create({
        data: {
          salonId: booking.salonId,
          masterId: booking.masterId,
          date: booking.date,
          startTime: booking.time,
          endTime,
          title: booking.serviceName === 'Терміново закрито' ? 'Терміново закрито' : 'Перерва',
          type: 'BREAK',
          isAllDay: false,
        }
      });
      migrated++;
    }

    // Delete the fake booking
    await prisma.booking.delete({ where: { id: booking.id } });
  }

  // 2. Clean up orphaned "-" clients
  const fakeClients = await prisma.client.findMany({
    where: { phone: '-' },
    select: { id: true, salonId: true }
  });

  let clientsDeleted = 0;
  for (const client of fakeClients) {
    // Check if client has any real bookings
    const realBookings = await prisma.booking.count({
      where: { clientId: client.id }
    });
    if (realBookings === 0) {
      await prisma.client.delete({ where: { id: client.id } });
      clientsDeleted++;
    }
  }

  console.log(`Migrated: ${migrated}, Skipped (duplicate): ${skipped}`);
  console.log(`Fake clients deleted: ${clientsDeleted}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

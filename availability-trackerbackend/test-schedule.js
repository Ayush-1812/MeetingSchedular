import { PrismaClient } from '@prisma/client';

async function testSchedule() {
  const prisma = new PrismaClient();
  
  try {
     const user = await prisma.user.findFirst({ where: { role: 'USER' } });
     const mentor = await prisma.user.findFirst({ where: { role: 'MENTOR' } });
     const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

     if (!user || !mentor || !admin) {
        console.log("Missing users");
        return;
     }

     const tomorrow = new Date();
     tomorrow.setDate(tomorrow.getDate() + 1);
     tomorrow.setUTCHours(10, 0, 0, 0);

     const end = new Date(tomorrow);
     end.setUTCHours(11, 0, 0, 0);

     console.log("Mocking availability for Tomorrow 10:00 - 11:00 UTC");
     
     // add user avail
     await prisma.availability.create({
        data: {
           userId: user.id,
           role: 'USER',
           date: tomorrow,
           startTime: tomorrow,
           endTime: end
        }
     }).catch(e => console.log("User avail exists"));
     
     // add mentor avail
     await prisma.availability.create({
        data: {
           mentorId: mentor.id,
           role: 'MENTOR',
           date: tomorrow,
           startTime: tomorrow,
           endTime: end
        }
     }).catch(e => console.log("Mentor avail exists"));

     // Test fetching overlaps
     const uSlots = await prisma.availability.findMany({ where: { userId: user.id } });
     const mSlots = await prisma.availability.findMany({ where: { mentorId: mentor.id } });
     console.log(`Found ${uSlots.length} user slots, ${mSlots.length} mentor slots`);
     
     // Direct meeting creation
     const res = await prisma.meeting.create({
        data: {
           adminId: admin.id,
           userId: user.id,
           mentorId: mentor.id,
           title: "Test Meeting Execution",
           startTime: tomorrow,
           endTime: end
        }
     });

     console.log("Meeting Created Successfully:", res.id);

  } catch(e) {
     console.error("Test Error:", e);
  } finally {
     await prisma.$disconnect();
  }
}
testSchedule();

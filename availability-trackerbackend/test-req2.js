import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

async function testPostSchedule() {
  const prisma = new PrismaClient();
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ id: admin.id, role: admin.role }, 'super_secret_jwt_key_1234', { expiresIn: '1h' });

  const user = await prisma.user.findFirst({ where: { role: 'USER' } });
  const mentor = await prisma.user.findFirst({ where: { role: 'MENTOR' } });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(10, 0, 0, 0);

  const end = new Date(tomorrow);
  end.setUTCHours(11, 0, 0, 0);

  try {
     const res = await fetch('http://localhost:5000/api/admin/meetings', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
           title: "API Meeting Test",
           startTime: tomorrow.toISOString(),
           endTime: end.toISOString(),
           userId: user.id,
           mentorId: mentor.id
        })
     });

     const data = await res.json();
     console.log("SCHEDULE API HTTP STATUS:", res.status);
     console.log("SCHEDULE API RESPONSE:", data);

  } catch(e) {
     console.log("Fetch Error:", e);
  } finally {
     await prisma.$disconnect();
  }
}

testPostSchedule();

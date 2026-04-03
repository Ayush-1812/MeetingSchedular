import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

async function testMatch() {
  const prisma = new PrismaClient();
  
  // Find an admin
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log("No ADMIN found to act on behalf of. Creating one.");
    admin = await prisma.user.create({
      data: { name: 'Admin', email: 'admin' + Date.now() + '@test.com', password: 'hash', role: 'ADMIN' }
    });
  }

  const token = jwt.sign({ id: admin.id, role: admin.role }, 'super_secret_jwt_key_1234', { expiresIn: '1h' });

  // Find a target user
  let user = await prisma.user.findFirst({ where: { role: 'USER' } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Test User', email: 'user' + Date.now() + '@test.com', password: 'hash', role: 'USER', tags: ['Beginner'] }
    });
  }

  // Ensure there's a mentor to recommend
  let mentor = await prisma.user.findFirst({ where: { role: 'MENTOR' } });
  if (!mentor) {
    mentor = await prisma.user.create({
      data: { name: 'Meta Engineer', email: 'mentor' + Date.now() + '@test.com', password: 'hash', role: 'MENTOR', tags: ['Meta', 'Software Engineering', 'Big Tech'], description: 'I work at Meta in big tech and can help with resume.' }
    });
  }

  console.log('Testing match for user:', user.id);

  try {
    const res = await fetch('http://localhost:5000/api/admin/match/' + user.id, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        callType: 'Resume Revamp',
        domain: 'Software Engineering'
      })
    });

    const text = await res.text();
    console.log('API Status:', res.status);
    console.log('API Response:', text);
  } catch(e) {
    console.error("Fetch Exception:", e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testMatch();

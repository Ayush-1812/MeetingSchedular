import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default 1 Admin, 5 Mentors, and 10 Users...');

  // Wipe existing users and everything
  await prisma.meeting.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Admin
  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@example.com',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  // 2. Create 5 Mentors
  const mentorsData = [
    { name: 'Alice TechLead', email: 'alice@mentor.com', role: 'MENTOR', tags: ['Tech', 'Big Company', 'Senior Developer'], description: 'I have 10 years of experience in Big Tech looking to help with Mock Interviews.' },
    { name: 'Bob Speaker', email: 'bob@mentor.com', role: 'MENTOR', tags: ['Non-tech', 'Good communication'], description: 'Help with job market guidance and improving your soft skills.' },
    { name: 'Charlie Code', email: 'charlie@mentor.com', role: 'MENTOR', tags: ['Tech', 'Ireland', 'Resume Revamp'], description: 'I will revamp your tech resume for European markets.' },
    { name: 'Diana Product', email: 'diana@mentor.com', role: 'MENTOR', tags: ['Non-tech', 'Public company'], description: 'Product management mock interviews and guidance.' },
    { name: 'Eve Engineer', email: 'eve@mentor.com', role: 'MENTOR', tags: ['Tech', 'India', 'Senior Developer'], description: 'Backend systems expert from India focusing on algorithm mock interviews.' },
  ];

  for (const m of mentorsData) {
    await prisma.user.create({
      data: { ...m, password: passwordHash }
    });
  }

  // 3. Create 10 Users
  const usersData = [
    { name: 'User One', email: 'user1@example.com', role: 'USER', tags: ['Tech', 'Mock Interviews'], description: 'Looking for someone to help me practice my coding interviews.' },
    { name: 'User Two', email: 'user2@example.com', role: 'USER', tags: ['Non-tech', 'Good communication'], description: 'Need guidance on presenting myself better in behavioral rounds.' },
    { name: 'User Three', email: 'user3@example.com', role: 'USER', tags: ['Resume Revamp', 'Tech'], description: 'Need my backend developer resume reviewed.' },
    { name: 'User Four', email: 'user4@example.com', role: 'USER', tags: ['Ireland', 'Job Market Guidance'], description: 'Want to know more about the tech market in Ireland.' },
    { name: 'User Five', email: 'user5@example.com', role: 'USER', tags: ['Big Company', 'Tech'], description: 'Aimed at FAANG companies, need guidance on the roadmap.' },
    { name: 'User Six', email: 'user6@example.com', role: 'USER', tags: ['Non-tech', 'Resume Revamp'], description: 'Review my product manager resume.' },
    { name: 'User Seven', email: 'user7@example.com', role: 'USER', tags: ['India', 'Mock Interviews'], description: 'Practice interviews for Indian startups.' },
    { name: 'User Eight', email: 'user8@example.com', role: 'USER', tags: ['Senior Developer', 'Tech'], description: 'Need someone to mentor me on system design.' },
    { name: 'User Nine', email: 'user9@example.com', role: 'USER', tags: ['Public company', 'Job Market Guidance'], description: 'General career advice from someone in a public company.' },
    { name: 'User Ten', email: 'user10@example.com', role: 'USER', tags: ['Tech', 'Asks a lot of questions'], description: 'I am a beginner and have many questions about getting started.' },
  ];

  for (const u of usersData) {
    await prisma.user.create({
      data: { ...u, password: passwordHash }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

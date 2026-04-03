import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { v4 as uuidv4 } from "uuid";
import { isPastTime } from "../utils/time.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, email: true, tags: true, description: true, timezone: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
}

export async function listMentors(req, res, next) {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      select: { id: true, name: true, email: true, tags: true, description: true, timezone: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    res.json(mentors);
  } catch (e) {
    next(e);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, tags, description } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!role || !["USER", "MENTOR"].includes(role)) {
      return res.status(400).json({ error: "Role must be USER or MENTOR" });
    }
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const displayName = name?.trim() || email.trim().split("@")[0] || "User";
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: displayName,
        email: email.trim().toLowerCase(),
        password: hashed,
        role,
        tags: Array.isArray(tags) ? tags : [],
        description: description || null,
        timezone: "UTC",
      },
      select: { id: true, name: true, email: true, role: true, tags: true, description: true, timezone: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
}

// Vectorless RAG matching using OpenAI
export async function getMatchForUser(req, res, next) {
  let user;
  let mentors;
  try {
    const { userId } = req.params;
    const { callType, domain } = req.body;
    
    user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      select: { id: true, name: true, email: true, tags: true, description: true },
    });

    if (!callType) {
      // Fallback to tags based basic match or simple return if callType not given
      return res.status(400).json({ error: "callType is required in request body" });
    }

    const prompt = `You are an expert mentor recommendation system.
You need to recommend the top 3 mentors for a user based on their specific requirement.

User Requirements:
Call Type: ${callType}
Domain: ${domain || user.tags.join(", ") || "Not Specified"}
User Existing Background Tags: ${user.tags.join(", ")}

Recommendation Rules:
- If Call Type is "Resume Revamp": Ideally, prioritize mentors who are from big tech (e.g. Google, Meta, MAANG, etc in their tags/description).
- If Call Type is "Job Market Guidance": Prioritize mentors who are good at communication or mention communication skills.
- If Call Type is "Mock Interviews": Prioritize mentors from the exact same domain as the user.

Available Mentors:
${JSON.stringify(mentors.map(m => ({ id: m.id, name: m.name, tags: m.tags, description: m.description })), null, 2)}

Respond ONLY with a valid JSON array of the top recommended mentors, formatted exactly like this WITHOUT markdown code blocks:
[
  { "id": "mentor_id_here", "score": 95, "reason": "Detailed explanation of why they are a good match based on the rules." }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let aiRes = response.text.trim();
    if (aiRes.startsWith("\`\`\`json")) {
      aiRes = aiRes.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
    }
    
    let suggestions = [];
    try {
      suggestions = JSON.parse(aiRes);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiRes);
      return res.status(500).json({ error: "Failed to parse AI recommendations." });
    }

    // Merge AI suggestions with mentor data
    const matched = suggestions.map(s => {
      const mentor = mentors.find(m => m.id === s.id);
      return mentor ? { ...mentor, score: s.score, reason: s.reason } : null;
    }).filter(Boolean);

    res.json(matched);
  } catch(e) {
    console.error("Gemini matching error or rare limit hit. Falling back to tag match:", e.message);
    if (!mentors || !user) {
      return res.status(500).json({ error: "Failed to load database content before match failure" });
    }
    // Basic fallback matching based on overlapping tags
    const matched = mentors.map(m => {
      const mTags = m.tags.map(t => t.toLowerCase());
      const userTags = user.tags.map(t => t.toLowerCase());
      const overlap = userTags.filter(t => mTags.includes(t)).length;
      return { ...m, score: overlap, reason: "Fallback logic: Tag overlap match." };
    }).sort((a, b) => b.score - a.score);

    return res.json(matched);
  }
}

export async function updateMentor(req, res, next) {
  try {
    const { mentorId } = req.params;
    const { tags, description } = req.body;
    
    let parsedTags = tags;
    if (typeof tags === 'string') {
       parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    }
    
    const mentor = await prisma.user.update({
      where: { id: mentorId },
      data: {
         tags: parsedTags,
         description
      },
      select: { id: true, name: true, tags: true, description: true }
    });
    
    res.json(mentor);
  } catch (e) {
    next(e);
  }
}
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getAvailabilityForUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { weekStart } = req.query;
    const weekStartDate = weekStart ? new Date(weekStart) : getWeekStart(new Date());
    weekStartDate.setUTCHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setUTCDate(weekStartDate.getUTCDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const slots = await prisma.availability.findMany({
      where: {
        OR: [
          { userId, role: "USER" },
          { mentorId: userId, role: "MENTOR" },
        ],
        date: { gte: weekStartDate, lt: new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    res.json(slots);
  } catch (e) {
    next(e);
  }
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getOverlappingSlots(req, res, next) {
  try {
    const { userId, mentorId } = req.params;

    const userSlots = await prisma.availability.findMany({
      where: { userId, role: "USER" },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const mentorSlots = await prisma.availability.findMany({
      where: { mentorId, role: "MENTOR" },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const overlaps = [];

    for (const u of userSlots) {
      for (const m of mentorSlots) {
        if (u.date.getTime() === m.date.getTime()) {
          if (rangesOverlap(u.startTime, u.endTime, m.startTime, m.endTime)) {
            const overlapStart = new Date(Math.max(u.startTime.getTime(), m.startTime.getTime()));
            const overlapEnd = new Date(Math.min(u.endTime.getTime(), m.endTime.getTime()));
            overlaps.push({
              date: u.date,
              startTime: overlapStart,
              endTime: overlapEnd,
              userId: u.userId,
              mentorId: m.mentorId,
            });
          }
        }
      }
    }

    res.json(overlaps);
  } catch (e) {
    next(e);
  }
}

export async function scheduleMeeting(req, res, next) {
  try {
    const adminId = req.userId;
    const { title, startTime, endTime, userId, mentorId } = req.body;

    if (!title?.trim() || !startTime || !endTime || !userId || !mentorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }
    if (isPastTime(start)) {
      return res.status(400).json({ error: "Cannot schedule meeting in the past" });
    }

    const meeting = await prisma.meeting.create({
      data: {
        id: uuidv4(),
        adminId,
        userId,
        mentorId,
        title: title.trim(),
        startTime: start,
        endTime: end,
      },
    });

    res.status(201).json(meeting);
  } catch (e) {
    next(e);
  }
}

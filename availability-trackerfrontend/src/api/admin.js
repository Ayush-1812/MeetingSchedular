import { get, post, put } from "./client.js";

export async function listUsers() {
  return get("/api/admin/users");
}

export async function listMentors() {
  return get("/api/admin/mentors");
}

export async function createUser(data) {
  return post("/api/admin/create-user", data);
}

export async function updateMentor(mentorId, data) {
  return put(`/api/admin/mentors/${mentorId}`, data);
}

export async function getAvailabilityForUser(userId, weekStart) {
  const q = weekStart ? `?weekStart=${weekStart}` : "";
  return get(`/api/admin/availability/${userId}${q}`);
}

export async function getMatchForUser(userId, callType, domain) {
  return post(`/api/admin/match/${userId}`, { callType, domain });
}

export async function getOverlappingSlots(userId, mentorId) {
  return get(`/api/admin/overlap/${userId}/${mentorId}`);
}

export async function scheduleMeeting(data) {
  return post("/api/admin/meetings", data);
}

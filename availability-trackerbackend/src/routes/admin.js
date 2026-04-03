import { Router } from "express";
import {
  listUsers,
  listMentors,
  createUser,
  getAvailabilityForUser,
  getOverlappingSlots,
  scheduleMeeting,
  getMatchForUser,
  updateMentor
} from "../controllers/adminController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate);
adminRoutes.use(requireRole("ADMIN"));

adminRoutes.get("/users", listUsers);
adminRoutes.get("/mentors", listMentors);
adminRoutes.put("/mentors/:mentorId", updateMentor);
adminRoutes.post("/create-user", createUser);
adminRoutes.post("/match/:userId", getMatchForUser);
adminRoutes.get("/availability/:userId", getAvailabilityForUser);
adminRoutes.get("/overlap/:userId/:mentorId", getOverlappingSlots);
adminRoutes.post("/meetings", scheduleMeeting);

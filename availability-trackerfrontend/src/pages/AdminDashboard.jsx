import { useState, useEffect, useCallback } from "react";
import { DateTime } from "luxon";
import * as adminApi from "../api/admin";
import * as meetingsApi from "../api/meetings";

const ProfileTooltip = ({ rawLabel, personData }) => {
  if (!personData) return <span>{rawLabel || "N/A"}</span>;
  return (
    <div className="relative group inline-block cursor-help">
      <span className="border-b border-dashed border-zinc-500 text-zinc-300 hover:text-white transition-colors">{personData.name || rawLabel}</span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-zinc-950 border border-zinc-700/80 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-700/80"></div>
        <p className="font-semibold text-white mb-1">{personData.name}</p>
        <p className="text-xs text-zinc-400 italic mb-3 line-clamp-4">"{personData.description || "No explicit background provided."}"</p>
        <div className="flex flex-wrap gap-1.5">
          {personData.tags?.map((t, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-wider rounded border border-blue-500/20 shadow-sm">
              {t}
            </span>
          ))}
          {(!personData.tags || personData.tags.length === 0) && <span className="text-[10px] text-zinc-500">NO TAGS</span>}
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [matchedMentors, setMatchedMentors] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [callType, setCallType] = useState("Resume Revamp");
  const [domain, setDomain] = useState("");
  
  const [overlaps, setOverlaps] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  const [manageMentorId, setManageMentorId] = useState("");
  const [manageTags, setManageTags] = useState("");
  const [manageDesc, setManageDesc] = useState("");
  const [manageLoading, setManageLoading] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      const u = await adminApi.listUsers();
      const m = await adminApi.listMentors();
      setUsers(u);
      setMentors(m);
      loadMeetings();
    } catch (e) {
      setError(e.message || "Failed to load data");
    }
  }, []);

  const loadMeetings = async () => {
    try {
      const m = await meetingsApi.listMeetings();
      setMeetings(m);
    } catch {
      setMeetings([]);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle User Selection
  useEffect(() => {
    if (!selectedUserId || !callType) {
      setMatchedMentors([]);
      setSelectedMentorId("");
      return;
    }
    const fetchMatches = async () => {
      try {
        const matches = await adminApi.getMatchForUser(selectedUserId, callType, domain);
        setMatchedMentors(matches);
        if (matches.length > 0) {
          setSelectedMentorId(matches[0].id);
        }
      } catch (err) {
        console.warn("Failed to fetch matches", err);
      }
    };
    fetchMatches();
  }, [selectedUserId, callType, domain]);

  // Handle overlap fetching when mentor or user changes
  useEffect(() => {
    if (!selectedUserId || !selectedMentorId) {
      setOverlaps([]);
      return;
    }
    const fetchOverlaps = async () => {
      try {
        const ov = await adminApi.getOverlappingSlots(selectedUserId, selectedMentorId);
        setOverlaps(ov);
      } catch (err) {
        setOverlaps([]);
      }
    };
    fetchOverlaps();
  }, [selectedUserId, selectedMentorId]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!scheduleTitle) return setError("Meeting title is required.");
    if (!scheduleStart || !scheduleEnd) return setError("Select an overlap to populate the start and end times.");
    
    setLoading(true);
    try {
      await adminApi.scheduleMeeting({
        title: scheduleTitle,
        startTime: new Date(scheduleStart).toISOString(),
        endTime: new Date(scheduleEnd).toISOString(),
        userId: selectedUserId,
        mentorId: selectedMentorId,
      });
      setSuccess("Meeting scheduled successfully");
      loadMeetings();
      setScheduleTitle("");
      setScheduleStart("");
      setScheduleEnd("");
    } catch (err) {
      setError(err.message || "Failed to schedule meeting.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    try {
      await meetingsApi.deleteMeeting(id);
      loadMeetings();
    } catch (err) {
      setError("Failed to delete meeting.");
    }
  };

  const handleUpdateMentor = async (e) => {
    e.preventDefault();
    if (!manageMentorId) return;
    setManageLoading(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateMentor(manageMentorId, { tags: manageTags, description: manageDesc });
      setSuccess("Mentor metadata updated successfully!");
      loadInitialData(); // reload updated mentors
    } catch (err) {
      setError(err.message || "Failed to update mentor metadata");
    } finally {
      setManageLoading(false);
    }
  };

  const formatSlot = (startIso, endIso) => {
    const s = DateTime.fromISO(startIso);
    const e = DateTime.fromISO(endIso);
    return `${s.toFormat("ccc, dd LLL HH:mm")} - ${e.toFormat("HH:mm")}`;
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 font-medium">Match users to mentors and schedule sessions.</p>
      </header>

      {error && (
        <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-emerald-400 text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selection Column */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">1. Select Participants</h2>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Select User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose a User --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          
          {selectedUserId && (() => {
             const u = users.find(x => x.id === selectedUserId);
             return u ? (
               <div className="bg-zinc-800/50 p-4 rounded-lg mt-2 border border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-1">User Requirements & Background</h3>
                  <p className="text-xs text-zinc-400 mb-2 italic">"{u.description || "No specific background description provided."}"</p>
                  <div className="flex flex-wrap gap-2">
                     {u.tags?.map((t, i) => <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">{t}</span>)}
                     {(!u.tags || u.tags.length === 0) && <span className="text-xs text-zinc-500">No tags found for user</span>}
                  </div>
               </div>
             ) : null;
          })()}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Call Type</label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Resume Revamp">Resume Revamp</option>
                <option value="Job Market Guidance">Job Market Guidance</option>
                <option value="Mock Interviews">Mock Interviews</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Domain (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Software Engineering"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Select Mentor (AI Recommended)</label>
            <select
              value={selectedMentorId}
              onChange={(e) => setSelectedMentorId(e.target.value)}
              disabled={!selectedUserId && matchedMentors.length === 0}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">-- Choose a Mentor --</option>
              {matchedMentors.length > 0 
                ? matchedMentors.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - Match Score: {m.score} ({m.reason?.substring(0, 50)}...)</option>
                  ))
                : mentors.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))
              }
            </select>
          </div>
          
          {selectedMentorId && (() => {
             const m = mentors.find(x => x.id === selectedMentorId);
             return m ? (
               <div className="bg-emerald-900/10 p-4 rounded-lg mt-2 border border-emerald-500/20">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-1">Recommended Mentor Profile</h3>
                  <p className="text-xs text-zinc-400 mb-2 italic">"{m.description || "No specific background description provided."}"</p>
                  <div className="flex flex-wrap gap-2">
                     {m.tags?.map((t, i) => <span key={i} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">{t}</span>)}
                     {(!m.tags || m.tags.length === 0) && <span className="text-xs text-zinc-500">No tags found for mentor</span>}
                  </div>
               </div>
             ) : null;
          })()}
        </div>

        {/* Scheduling Column */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">2. Schedule Meeting</h2>
          
          <div>
             <label className="block text-sm font-medium text-zinc-400 mb-2">Overlapping Slots (UTC)</label>
             <div className="max-h-[150px] overflow-y-auto space-y-2 border border-zinc-800 rounded-lg p-2 bg-zinc-950">
               {overlaps.length === 0 ? (
                 <p className="text-zinc-500 text-sm p-2">No overlaps found for selected user & mentor.</p>
               ) : (
                 overlaps.map((ov, i) => (
                   <button
                     key={i}
                     onClick={() => {
                        setScheduleStart(ov.startTime);
                        setScheduleEnd(ov.endTime);
                        if (!scheduleTitle) {
                          const uName = users.find(u => u.id === selectedUserId)?.name || "User";
                          const mName = mentors.find(m => m.id === selectedMentorId)?.name || "Mentor";
                          setScheduleTitle(`Mentoring: ${uName} <> ${mName}`);
                        }
                     }}
                     className="block w-full text-left p-2 rounded hover:bg-zinc-800 focus:bg-zinc-800 text-sm text-zinc-300 transition-colors"
                   >
                     {formatSlot(ov.startTime, ov.endTime)}
                   </button>
                 ))
               )}
             </div>
          </div>

          <form onSubmit={handleSchedule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                value={scheduleTitle}
                onChange={e => setScheduleTitle(e.target.value)}
                placeholder="Meeting Title"
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Start Time (UTC)</label>
                  <input
                    type="text"
                    readOnly
                    value={scheduleStart ? formatSlot(scheduleStart, scheduleStart).split(" - ")[0] : ""}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white px-3 py-2 opacity-70"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">End Time (UTC)</label>
                  <input
                    type="text"
                    readOnly
                    value={scheduleEnd ? formatSlot(scheduleEnd, scheduleEnd).split(" - ")[0] : ""}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white px-3 py-2 opacity-70"
                  />
               </div>
            </div>
            
            <button
               type="submit"
               disabled={!scheduleStart || loading}
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
               {loading ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </form>
        </div>

        {/* Mentor Management Column */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">3. Mentor Management (Metadata)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Select Mentor to Edit</label>
              <select
                value={manageMentorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setManageMentorId(id);
                  const m = mentors.find(x => x.id === id);
                  if (m) {
                    setManageTags(m.tags?.join(", ") || "");
                    setManageDesc(m.description || "");
                  } else {
                     setManageTags(""); setManageDesc("");
                  }
                }}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white font-medium px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a Mentor --</option>
                {mentors.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            
            <form onSubmit={handleUpdateMentor} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (Comma Separated)</label>
                 <input
                   type="text"
                   value={manageTags}
                   onChange={e => setManageTags(e.target.value)}
                   disabled={!manageMentorId}
                   placeholder="e.g. Meta, Software Engineering, Resume"
                   className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-zinc-400 mb-1">Bio / Description</label>
                 <textarea
                   value={manageDesc}
                   onChange={e => setManageDesc(e.target.value)}
                   disabled={!manageMentorId}
                   placeholder="Short bio outlining experience..."
                   className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-white px-3 py-2 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                 />
              </div>
              <button
                 type="submit"
                 disabled={!manageMentorId || manageLoading}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                 {manageLoading ? "Saving..." : "Save Metadata"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
         <h2 className="text-lg font-semibold text-white mb-4">Upcoming Meetings</h2>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
               <thead className="bg-zinc-950 text-zinc-400">
                  <tr>
                     <th className="p-3 rounded-tl-lg">Title</th>
                     <th className="p-3">Time (UTC)</th>
                     <th className="p-3">User</th>
                     <th className="p-3">Mentor</th>
                     <th className="p-3 rounded-tr-lg">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-800">
                  {meetings.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-500">No meetings booked.</td>
                     </tr>
                  ) : (
                     meetings.map(m => (
                        <tr key={m.id} className="hover:bg-zinc-800/50">
                           <td className="p-3 font-medium">{m.title}</td>
                           <td className="p-3 whitespace-nowrap">{formatSlot(m.startTime, m.endTime)}</td>
                           <td className="p-3"><ProfileTooltip rawLabel={m.user?.name} personData={m.user} /></td>
                           <td className="p-3"><ProfileTooltip rawLabel={m.mentor?.name} personData={m.mentor} /></td>
                           <td className="p-3">
                              <button onClick={() => handleDeleteMeeting(m.id)} className="text-red-400 hover:text-red-300 font-semibold uppercase text-xs">Delete</button>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}

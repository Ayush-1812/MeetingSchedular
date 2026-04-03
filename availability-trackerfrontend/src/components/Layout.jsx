import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SSO_WELCOME_MODAL_KEY = "sso_show_welcome_modal";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const email = user?.email ?? "";

  const [welcomeModal, setWelcomeModal] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleWindowClick = () => setProfileOpen(false);
    if (profileOpen) {
      window.addEventListener("click", handleWindowClick);
    }
    return () => window.removeEventListener("click", handleWindowClick);
  }, [profileOpen]);

  // Show modal as soon as sessionStorage key exists, even before user loads
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SSO_WELCOME_MODAL_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      sessionStorage.removeItem(SSO_WELCOME_MODAL_KEY);
      setWelcomeModal({
        email: data.email || "—",
        role: data.role || "—",
      });
      const t = setTimeout(() => setWelcomeModal(null), 2500);
      return () => clearTimeout(t);
    } catch (_) {}
  }, []); // ← run once on mount, not dependent on user

  const handleLogout = () => {
    logout();
    navigate("/welcome");
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {welcomeModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/95 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setWelcomeModal(null)} // ← click anywhere to dismiss
        >
          <div
            className="bg-navy-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-modal-title"
          >
            <div className="flex justify-center mb-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-400" aria-hidden>
                <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            </div>
            <p id="welcome-modal-title" className="text-slate-400 text-lg mb-6">
              Logged in as
            </p>
            <p className="text-white text-xl sm:text-2xl mb-3 break-all">
              {welcomeModal.email}
            </p>
            <p className="text-blue-400 text-xl sm:text-2xl font-semibold">
              {welcomeModal.role}
            </p>
            <p className="text-slate-600 text-xs mt-6">Click anywhere to continue</p>
          </div>
        </div>
      )}
      <header className="border-b border-navy-700 bg-navy-900/80 backdrop-blur">
        <div className="w-full px-4 h-14 flex items-center justify-between">
          {isAdminRoute && user?.role === "ADMIN" ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/mentorque-logo.png.jpeg"
                    alt="MentorQue"
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-white font-medium">
                    Mentorque Availability Tracker
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen(!profileOpen);
                  }}
                  className="flex items-center gap-3 hover:bg-navy-800 p-1 rounded-lg transition-colors relative"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">{user?.role || "ADMIN"}</span>
                  {email && <span className="text-slate-300 text-sm font-medium mr-1">{email}</span>}
                </button>

                {profileOpen && (
                  <div className="absolute top-12 right-16 w-72 p-4 bg-navy-950 border border-navy-700/80 rounded-xl shadow-2xl z-50 text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3 border-b border-navy-800 pb-3">
                       <h3 className="font-semibold text-white truncate mr-2">{user?.name}</h3>
                    </div>
                    <div className="mb-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Biography</p>
                      <p className="text-xs text-slate-400 italic line-clamp-4 leading-relaxed">"{user?.description || "No specific background description active."}"</p>
                    </div>
                    <div className="mb-1">
                       <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">My Tags</p>
                       <div className="flex flex-wrap gap-1.5">
                         {user?.tags?.map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded border border-blue-500/20">
                              {t}
                            </span>
                         ))}
                         {(!user?.tags || user?.tags.length === 0) && (
                            <span className="text-xs text-slate-500 font-medium">None</span>
                         )}
                       </div>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <img
                  src="/mentorque-logo.png.jpeg"
                  alt="MentorQue"
                  className="h-8 w-8 object-contain"
                />
                <nav className="flex items-center gap-6">
                  <NavLink
                    to={user?.role === "MENTOR" ? "/mentor" : "/availability"}
                    className={({ isActive }) =>
                      `text-sm font-medium ${isActive ? "text-primary-400" : "text-slate-400 hover:text-slate-200"}`
                    }
                  >
                    My Availability
                  </NavLink>
                  {user?.role === "ADMIN" && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `text-sm font-medium ${isActive ? "text-primary-400" : "text-slate-400 hover:text-slate-200"}`
                      }
                    >
                      Admin
                    </NavLink>
                  )}
                </nav>
              </div>
              <div className="flex items-center gap-4 relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen(!profileOpen);
                  }}
                  className="flex items-center gap-3 hover:bg-navy-800 p-1 rounded-lg transition-colors"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">{user?.role}</span>
                  {email && <span className="text-slate-300 text-sm font-medium mr-1">{email}</span>}
                </button>

                {profileOpen && (
                  <div className="absolute top-12 right-16 w-72 p-4 bg-navy-950 border border-navy-700/80 rounded-xl shadow-2xl z-50 text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3 border-b border-navy-800 pb-3">
                       <h3 className="font-semibold text-white truncate mr-2">{user?.name}</h3>
                    </div>
                    <div className="mb-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Biography</p>
                      <p className="text-xs text-slate-400 italic line-clamp-4 leading-relaxed">"{user?.description || "No specific background description active."}"</p>
                    </div>
                    <div className="mb-1">
                       <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">My Tags</p>
                       <div className="flex flex-wrap gap-1.5">
                         {user?.tags?.map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded border border-blue-500/20">
                              {t}
                            </span>
                         ))}
                         {(!user?.tags || user?.tags.length === 0) && (
                            <span className="text-xs text-slate-500 font-medium">None</span>
                         )}
                       </div>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
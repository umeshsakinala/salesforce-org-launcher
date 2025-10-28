import React, { useState, useEffect, useContext, createContext } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import OrgGrid from "./OrgGrid";
import Admin from "./Admin";
import EditOrgs from "./EditOrgs";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [view, setView] = useState("orgs");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/check-auth", { credentials: "include" });
        const data = await res.json();
        setIsLoggedIn(data.authenticated);
      }
      catch(err) {
        console.error("Error checking auth:", err);
      }
      finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, checkingAuth }}>
      <div className="app">
        <ToastContainer position="top-right" autoClose={3000} />
        <header>
          <h1>Salesforce Org Launcher</h1>
          <nav>
            <button onClick={() => setView("orgs")} className={view === "orgs" ? "active": ""}>
              Orgs
            </button>
            <button onClick={() => setView("admin")} className={view === "admin" ? "active": ""}>
              Admin
            </button>
            {isLoggedIn && (
              <button onClick={() => setView("edit-orgs")} className={view === "edit-orgs" ? "active": ""}>
                Edit Orgs
              </button>
            )}
          </nav>
        </header>
        <main>
          {view === "orgs" && <OrgGrid />}
          {view === "admin" && <Admin />}
          {view === "edit-orgs" && (isLoggedIn ? <EditOrgs /> : <p>Unauthorized</p>)}
        </main>
      </div>
    </AuthContext.Provider>
  )
}
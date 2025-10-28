import React, { useState, useEffect } from "react";
import { useAuth } from "./App.jsx";
import "./Admin.css";

export default function Admin() {
    // const [isLoggedIn, setIsLoggedIn] = useState(false);
    const API_BASE = import.meta.env.VITE_API_BASE || "";
    const { isLoggedIn, setIsLoggedIn, checkingAuth } = useAuth();
    const [password, setPassword] = useState("");
    const [form, setForm] = useState({
        name: "",
        salesforce_url: "https://login.salesforce.com",
        username: "",
        password: "",
    });
    const [message, setMessage] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const dropdownRef = React.useRef(null);
    // useEffect(() => {
    //     const checkAuth = async () => {
    //         try {
    //             const res = await fetch("/api/check-auth", { credentials: "include" });
    //             const data = await res.json();
    //             if(data.authenticated) setIsLoggedIn(true);
    //             else setIsLoggedIn(false);
    //         }
    //         catch(err) {
    //             console.log("Error checking auth:", err);
    //             setIsLoggedIn(false);
    //         }
    //         finally {
    //             setCheckingAuth(false);
    //         }

    //     };
    //     checkAuth();
    // }, []);
    // useEffect(() => {
    //     console.log('isLoggedIn changed:', isLoggedIn);
    // }, [isLoggedIn])
    useEffect(() => {
        const handleClickOutside = (e) => {
            if(dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const login = async () => {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({password}),
            credentials: "include",
        });
        if(res.ok) {
            setIsLoggedIn(true);
            setMessage("");
            await fetch(`${API_BASE}/api/check-auth`, { credentials: "include" });
        }
        else {
            setMessage("Login Failed");
        }
    };
    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value});
    };
    const handleSelect = (url) => {
        setForm((s) => ({...s, salesforce_url: url}));
        setDropdownOpen(false);
    };
    const validateForm = () => {
        if(!form.name.trim() || !form.username.trim() || !form.password.trim()) {
            setMessage("⚠️ Please fill all the fields before saving.");
            return false;
        }
        return true;
    };

    const saveOrg = async () => {
        setMessage("");
        if(!validateForm()) return;
        const res = await fetch(`${API_BASE}/api/orgs`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(form),
            credentials: "include",
        });
        if(res.ok) {
            setMessage("✅ Org saved successfully!");
            setForm({
                name: "",
                salesforce_url: "https://login.salesforce.com",
                username: "",
                password: "",
            });
        }
        else {
            console.log('Response:', JSON.stringify(res, null, 2));
            console.log(res);
            setMessage("❌ Error saving org");
        }
    };

    if(checkingAuth) {
        return (
            <div className="admin-wrapper">
                <div className="admin-panel">
                    <p>Checking authentication...</p>
                </div>
            </div>
        );
    }

    if(!isLoggedIn) {
        return (
        <div className="admin-wrapper">
            <div className="admin-panel">
                <h2>Admin Login</h2>
                <input className="input" type={showPassword ? "text" : "password"} placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                <div className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "Hide" : "Show"}
                </div>
                <button className="button" onClick={login}>Login</button>
                {message && <p className="status-message">{message}</p>}
            </div>
        </div>
        );
    }
    
    return (
        <div className="admin-wrapper">
            <div className="admin-panel">
                <h2>Add New Salesforce Org</h2>
                <input name="name" placeholder="Org Name" value={form.name} onChange={handleChange}/>
                <div className="custom-dropdown">
                    <div className="dropdown-selected" onClick={() => setDropdownOpen(!dropdownOpen)}>
                        {form.salesforce_url.includes("test") ? "Sandbox" : "Production"}
                        <span className={`arrow ${dropdownOpen ? "up" : "down"}`}>▼</span>
                    </div>
                    {dropdownOpen && (
                        <div className="dropdown-options">
                            <div className="dropdown-option" onClick={() => handleSelect("https://login.salesforce.com")}>
                                Production
                            </div>
                            <div className="dropdown-option" onClick={() => handleSelect("https://test.salesforce.com")}>
                                Sandbox
                            </div>
                        </div>
                    )}
                </div>
                <input name="username" placeholder="Username" value={form.username} onChange={handleChange}/>
                {/* <div className="password-wrapper"> */}
                    <input name="password" type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={handleChange}/>
                    <div className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? "Hide" : "Show"}
                    </div>
                    <button onClick={saveOrg}>Save Org</button>
                    {message && <p className="status-message">{message}</p>}
                {/* </div> */}
            </div>
        </div>
    )
}
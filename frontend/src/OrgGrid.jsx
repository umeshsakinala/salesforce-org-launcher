import React, {useEffect, useState} from "react";
import { toast } from "react-toastify";

export default function OrgGrid() {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const fetchOrgs = async () => {
        try {
            const res = await fetch("/api/orgs", {
                credentials: "include"
            });
            if(!res.ok) throw new Error("Failed to fetch orgs");
            const data = await res.json();
            if(Array.isArray(data)) {
                setOrgs(data);
            }
            else {
                console.warn("Unexpected response:", data);
                setOrgs([]);
            }
        } catch (err) {
            console.error("Error loading orgs:", err);
            setError("Could not load orgs. Please check backend.");
        } finally {
            setLoading(false);
        }
        };
        fetchOrgs();
    }, []);

    const handleLaunch = async (id) => {
        try {
            const res = await fetch(`/api/orgs/${id}/creds`, { credentials: "include" });
            if(!res.ok) throw new Error("Failed to fetch credentials");
            const { username, password, salesforce_url } = await res.json();
            //const textToCopy = `Username: ${username}\nPassword: ${password}`;
            // await navigator.clipboard.writeText(password);
            // await navigator.clipboard.writeText(username);
            // setTimeout(async () => {
            //     alert("Credentials copied to clipboard!");
            // }, 1000);
            const loginUrl = salesforce_url.includes("test")
            ? "https://test.salesforce.com"
            : "https://login.salesforce.com";
            window.open(loginUrl, "_blank");
        }
        catch(err) {
            console.error("Error launching org:", err);
            // alert("❌ Could not fetch credentials or copy to clipboard.");
            toast.error("Could not fetch credentials or copy to clipboard.");
        }
    };

    const copyField = async (id, field) => {
        const res = await fetch(`/api/orgs/${id}/creds`, { credentials: "include" });
        const data = await res.json();
        await navigator.clipboard.writeText(data[field]);
        toast.success(`${field} copied to clipboard!`);
        // alert(` ${field} copied to clipboard!`);
    };


    return (
        <div className="org-grid">
            {orgs.length === 0 ? (
                <p>No Orgs Found. Add some from the Admin Panel</p>
            ) : (
                orgs.map((org) => {
                    return(
                        <div key={org._id} className="org-card">
                            <h3>{org.name}</h3>
                            <p>{org.salesforce_url.includes("test") ? "Sandbox" : "Production"}</p>
                            <button onClick={() => handleLaunch(org._id)}>Launch</button>
                            <button onClick={() => copyField(org._id, "username")}>Copy Username</button>
                            <button onClick={() => copyField(org._id, "password")}>Copy Password</button>
                        </div>
                    );
                })
            )}
        </div>
    )
}
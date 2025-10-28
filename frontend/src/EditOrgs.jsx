import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import "./EditOrgs.css";

export default function EditOrgs() {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ username: "", password: "" });
    const API_BASE = import.meta.env.VITE_API_BASE || "";

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/orgs`, { credentials: "include" });
                const data = await res.json();
                setOrgs(data);
            }
            catch (err) {
                toast.error("Failed to load orgs", {
                    position: "top-center",
                });
            }
            finally {
                setLoading(false);
            }
        };
        fetchOrgs();
    }, []);

    const handleEdit = async (org) => {
        setEditing(org._id);
        try {
            const res = await fetch(`${API_BASE}/api/orgs/${org._id}/creds`, { credentials: "include" });
            if(!res.ok) throw new Error("Failed to fetch credentials");
            const data = await res.json();
            setForm({ username: data.username, password: data.password });
        }
        catch(err) {
            toast.error("Could not load credentials for editing", {
                position: "top-center",
            });
        }
    };

    const handleSave = async(id) => {
        try {
            const res = await fetch(`${API_BASE}/api/orgs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
                credentials: "include",
            });
            if(!res.ok) throw new Error("Failed to save org");
            toast.success("Org updated Succesfully", {
                position: "top-center",
            });
            setEditing(null);
            setOrgs((prev) => prev.map((org) => (org._id === id ? { ...org, ...form } : org)));
        }
        catch(error) {
            toast.error("Failed to save org", {
                position: "top-center",
            });
        }
    };

    const handleDelete = async (id) => {
        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "This action will permanently delete the org.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, delete it!",
            });
            if(!result.isConfirmed) return;
            const res = await fetch(`${API_BASE}/api/orgs/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if(!res.ok) throw new Error("Failed to delete org");
            toast.success("Org deleted successfully", {
                position: "top-center",
            });
            setOrgs((prev) => prev.filter((org) => org._id !== id));
        }
        catch(error) {
            toast.error("Failed to delete org", {
                position: "top-center",
            });
        }
    }

    if(loading) return <div>Loading Orgs</div>;
    return (
        <div className="edit-orgs-wrapper">
            {loading ? (
                <div className="loading">Loading Orgs...</div>
            ): (
                <div className="org-grid">
                    {orgs.map((org) => (
                        <div className="org-card" key={org._id}>
                            <h3>{org.name}</h3>
                            {editing === org._id ? (
                                <>
                                    <input value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} placeholder="UserName"></input>
                                    <input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Password"></input>
                                    <button onClick={() => handleSave(org._id)}>Save</button>
                                    <button onClick={() => setEditing(null)}>Cancel</button>
                                </>
                            ) : (
                                <>
                                    <p>Username: {org.username}</p>
                                    {/* <p>Password: {org.password}</p> */}
                                    <button onClick={() => handleEdit(org)}>Edit</button>
                                    <button onClick={() => handleDelete(org._id)}>Delete</button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
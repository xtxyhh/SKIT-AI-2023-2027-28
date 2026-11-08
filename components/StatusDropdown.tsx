"use client";

import { useState } from "react";

export default function StatusDropdown({
  patientId,
  currentStatus,
}: {
  patientId: number;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus || "New");
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setUpdating(true);

    try {
      await fetch("/api/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: patientId,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      value={status}
      disabled={updating}
      onChange={updateStatus}
      className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-cyan-500 transition disabled:opacity-50"
    >
      <option value="New">New</option>
      <option value="Contacted">Contacted</option>
      <option value="Consultation">Consultation</option>
      <option value="Hospital Assigned">Hospital Assigned</option>
      <option value="Treatment Started">Treatment Started</option>
      <option value="Completed">Completed</option>
      <option value="Closed">Closed</option>
    </select>
  );
}

/**
 * AcademicProgressDashboard
 * -------------------------
 * Standalone academic analytics UI component.
 *
 * Designed to be safely added to a React / Next.js codebase without
 * requiring API calls, database models, routing, or global state.
 *
 * Data is intentionally local and illustrative.
 */

import React from "react";

type Subject = {
  name: string;
  code: string;
  progress: number;
  score: number;
  attendance: number;
  color: string;
};

type Assignment = {
  title: string;
  subject: string;
  due: string;
  status: "Completed" | "In Progress" | "Pending";
};

const subjects: Subject[] = [
  { name: "Artificial Intelligence", code: "AI-501", progress: 82, score: 88, attendance: 91, color: "#6366f1" },
  { name: "Data Mining", code: "DM-502", progress: 74, score: 81, attendance: 86, color: "#0ea5e9" },
  { name: "Cloud Computing", code: "CC-503", progress: 69, score: 78, attendance: 83, color: "#14b8a6" },
  { name: "Blockchain Fundamentals", code: "BC-504", progress: 61, score: 75, attendance: 79, color: "#f59e0b" },
];

const assignments: Assignment[] = [
  { title: "Neural Network Implementation", subject: "Artificial Intelligence", due: "Oct 12", status: "In Progress" },
  { title: "Clustering Analysis Report", subject: "Data Mining", due: "Oct 14", status: "Pending" },
  { title: "Cloud Architecture Diagram", subject: "Cloud Computing", due: "Oct 09", status: "Completed" },
  { title: "Smart Contract Research", subject: "Blockchain Fundamentals", due: "Oct 17", status: "Pending" },
];

const activities = [
  ["Assignment submitted", "Cloud Architecture Diagram", "2 hours ago"],
  ["Quiz completed", "AI Fundamentals — 18/20", "Yesterday"],
  ["Course milestone", "Data Mining reached 75%", "2 days ago"],
  ["New material available", "Blockchain Module 4", "3 days ago"],
];

const averageScore = subjects.reduce((sum, item) => sum + item.score, 0) / subjects.length;
const averageAttendance = subjects.reduce((sum, item) => sum + item.attendance, 0) / subjects.length;

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 7, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "5px 8px", borderRadius: 8 }}>+4.2%</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 750 }}>{value}</div>
      <div style={{ marginTop: 4, color: "#374151", fontSize: 14, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 6, color: "#9ca3af", fontSize: 12 }}>{detail}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Assignment["status"] }) {
  const styles = {
    Completed: { background: "#ecfdf5", color: "#047857" },
    "In Progress": { background: "#eff6ff", color: "#2563eb" },
    Pending: { background: "#fff7ed", color: "#c2410c" },
  };

  return (
    <span style={{ ...styles[status], fontSize: 11, fontWeight: 700, padding: "5px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

export default function AcademicProgressDashboard() {
  return (
    <section aria-label="Academic progress dashboard" style={{
      minHeight: "100%", background: "#f8fafc", color: "#111827", padding: 32,
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 28 }}>
          <div>
            <p style={{ margin: "0 0 7px", color: "#6366f1", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Student Overview</p>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.2, letterSpacing: -0.8 }}>Academic Progress</h1>
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>Track your semester performance, attendance and coursework.</p>
          </div>
          <button type="button" style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 10, padding: "10px 14px", fontWeight: 650 }}>Current Semester</button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
          <StatCard label="Overall Score" value={`${averageScore.toFixed(0)}%`} detail="Across 4 active subjects" icon="◎" />
          <StatCard label="Attendance" value={`${averageAttendance.toFixed(0)}%`} detail="Above recommended minimum" icon="◷" />
          <StatCard label="Course Progress" value="72%" detail="Semester completion" icon="↗" />
          <StatCard label="Assignments" value="12 / 16" detail="4 submissions remaining" icon="✓" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.65fr) minmax(300px, 1fr)", gap: 20, marginBottom: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Subject performance</h2>
                <p style={{ margin: "5px 0 0", color: "#9ca3af", fontSize: 12 }}>Current progress and assessment performance</p>
              </div>
              <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 600 }}>4 subjects</span>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              {subjects.map((subject) => (
                <div key={subject.code}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 9 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{subject.name}</div>
                      <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 3 }}>{subject.code}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                      <span>{subject.attendance}% attendance</span>
                      <strong style={{ color: "#111827" }}>{subject.score}%</strong>
                    </div>
                  </div>
                  <ProgressBar value={subject.progress} color={subject.color} />
                  <div style={{ marginTop: 6, color: "#9ca3af", fontSize: 11 }}>{subject.progress}% course progress</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#111827", color: "#fff", borderRadius: 16, padding: 24 }}>
            <p style={{ margin: 0, color: "#a5b4fc", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Semester health</p>
            <h2 style={{ fontSize: 25, margin: "10px 0 8px" }}>On track</h2>
            <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Your overall academic indicators are trending positively. Maintain attendance while completing the remaining assignments.
            </p>
            <div style={{ display: "grid", gap: 14, paddingTop: 18, borderTop: "1px solid #374151" }}>
              <Metric label="Performance" value={`${averageScore.toFixed(0)}%`} />
              <Metric label="Attendance" value={`${averageAttendance.toFixed(0)}%`} />
              <Metric label="Completion" value="72%" />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Upcoming assignments</h2>
                <p style={{ margin: "5px 0 0", color: "#9ca3af", fontSize: 12 }}>Stay ahead of your coursework</p>
              </div>
              <button type="button" style={{ border: 0, background: "transparent", color: "#6366f1", fontWeight: 700, fontSize: 12 }}>View all</button>
            </div>

            <div>
              {assignments.map((assignment) => (
                <div key={assignment.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "15px 0", borderTop: "1px solid #f3f4f6" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{assignment.title}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>{assignment.subject} · Due {assignment.due}</div>
                  </div>
                  <StatusBadge status={assignment.status} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Recent activity</h2>
            <div style={{ marginTop: 18 }}>
              {activities.map(([title, description, time], index) => (
                <div key={`${title}-${time}`} style={{
                  display: "flex", gap: 12, paddingBottom: 17, marginBottom: 17,
                  borderBottom: index === activities.length - 1 ? "none" : "1px solid #f3f4f6"
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                    <div style={{ marginTop: 3, color: "#6b7280", fontSize: 11 }}>{description}</div>
                    <div style={{ marginTop: 5, color: "#9ca3af", fontSize: 10 }}>{time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 11, textAlign: "center" }}>
          Academic Progress Dashboard · Demo component · Illustrative data
        </footer>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

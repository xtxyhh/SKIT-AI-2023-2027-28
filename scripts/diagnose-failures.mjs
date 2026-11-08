async function diagnose() {
  console.log("Diagnosing authentication & patient routes...");

  // 1. Test Admin Login
  const adminLoginRes = await fetch("http://localhost:3000/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@healwithindia.com", password: "admin123" }),
  });
  const adminSetCookie = adminLoginRes.headers.get("set-cookie");
  console.log("Admin Login Status:", adminLoginRes.status);
  console.log("Admin Set-Cookie:", adminSetCookie);

  // 2. Test Patient Login
  const patientLoginRes = await fetch("http://localhost:3000/api/auth/patient-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "patient@healwithindia.com", password: "patient123" }),
  });
  const patientSetCookie = patientLoginRes.headers.get("set-cookie");
  const patientBody = await patientLoginRes.json();
  console.log("Patient Login Status:", patientLoginRes.status);
  console.log("Patient Set-Cookie:", patientSetCookie);
  console.log("Patient Body:", patientBody);

  const patientCookie = patientSetCookie ? patientSetCookie.split(";")[0] : "";

  // 3. Test Patient Dashboard with cookie
  const patDashRes = await fetch("http://localhost:3000/api/patient/dashboard", {
    headers: { Cookie: patientCookie },
  });
  console.log("Patient Dashboard Status:", patDashRes.status);
  const patDashBody = await patDashRes.text();
  console.log("Patient Dashboard Body:", patDashBody.slice(0, 300));

  // 4. Test Admin Monitoring with admin cookie
  const adminCookie = adminSetCookie ? adminSetCookie.split(";")[0] : "";
  const monRes = await fetch("http://localhost:3000/api/admin/monitoring", {
    headers: { Cookie: adminCookie },
  });
  console.log("Admin Monitoring Status:", monRes.status);
  const monBody = await monRes.text();
  console.log("Admin Monitoring Body:", monBody.slice(0, 300));

  // 5. Test Coordinator Dashboard with admin cookie
  const coordRes = await fetch("http://localhost:3000/api/coordinator/dashboard", {
    headers: { Cookie: adminCookie },
  });
  console.log("Coordinator Dashboard Status:", coordRes.status);
  const coordBody = await coordRes.text();
  console.log("Coordinator Dashboard Body:", coordBody.slice(0, 300));
}

diagnose();

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";
import { FALLBACK_PATIENTS } from "@/lib/fallback/mockDatabase";

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["Create", "Read", "Update", "Delete", "Export", "Approve", "Suspend", "Restore", "Manage Users", "Manage Hospitals", "Manage Finance", "Manage Safety", "Manage Settings"],
  admin: ["Create", "Read", "Update", "Delete", "Export", "Approve", "Suspend", "Restore", "Manage Users", "Manage Hospitals", "Manage Safety"],
  finance: ["Read", "Export", "Manage Finance"],
  safety_operator: ["Read", "Update", "Approve", "Manage Safety"],
  hospital_manager: ["Create", "Read", "Update", "Manage Hospitals"],
  coordinator: ["Read", "Update"],
  doctor: ["Read", "Update"],
  receptionist: ["Create", "Read", "Update"],
  support: ["Read", "Update"],
  marketing: ["Read", "Export"],
  sales: ["Read", "Update"],
  patient: ["Read"]
};

// Helper to get or initialize permissions from db
async function getRolePermissions(supabase: any) {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("email", "roles_permissions_config")
    .maybeSingle();

  if (error || !data) {
    // Seed default
    await supabase.from("employees").insert({
      name: "Role Permissions Config",
      email: "roles_permissions_config",
      role: "SystemConfig",
      phone: JSON.stringify(DEFAULT_PERMISSIONS)
    });
    return DEFAULT_PERMISSIONS;
  }

  try {
    return JSON.parse(data.phone || "{}");
  } catch (e) {
    return DEFAULT_PERMISSIONS;
  }
}

export async function GET(request: NextRequest) {
  try {
    const localAdmin = await getAuthenticatedAdmin(request);
    let isAdmin = !!localAdmin;

    if (!isAdmin) {
      try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          const callerRole = user?.app_metadata?.role;
          isAdmin = callerRole === "admin" || callerRole === "super_admin";
        }
      } catch {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Fetch employees, patients and mapping
    let employees: any[] = [];
    let patients: any[] = FALLBACK_PATIENTS;
    let mappings: any[] = [];

    try {
      const { data: empData } = await serviceSupabase.from("employees").select("*");
      if (empData) employees = empData;
      const { data: patData } = await serviceSupabase.from("patients").select("*");
      if (patData && patData.length > 0) patients = patData;
      const { data: mapData } = await serviceSupabase.from("patient_auth_mapping").select("*");
      if (mapData) mappings = mapData;
    } catch {
      // Fallback
    }

    // Filter out config record
    const filteredEmployees = (employees || []).filter(e => e.email !== "roles_permissions_config");

    // Combine users list
    const usersList = [
      ...filteredEmployees.map(e => ({
        id: e.id,
        type: "employee",
        name: e.name,
        email: e.email,
        phone: e.phone || "",
        role: e.role,
        status: e.portal_status || "ACTIVE",
        created_at: e.created_at,
        avatar: e.avatar,
        auth_user_id: e.auth_user_id || null
      })),
      ...(patients || []).map(p => {
        const map = (mappings || []).find(m => m.patient_id === p.id);
        return {
          id: p.id,
          type: "patient",
          name: p.full_name,
          email: p.email,
          phone: p.phone || "",
          role: "patient",
          status: map ? map.portal_access_status : "NOT_ENABLED",
          created_at: p.created_at,
          avatar: null,
          auth_user_id: map ? map.auth_user_id : null
        };
      })
    ];

    const permissions = await getRolePermissions(serviceSupabase);

    return NextResponse.json({ users: usersList, permissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = user?.app_metadata?.role;
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userData, permissions } = body;

    const serviceSupabase = createServiceRoleClient();

    if (action === "save_permissions") {
      if (!permissions) {
        return NextResponse.json({ error: "Permissions configuration is required" }, { status: 400 });
      }
      
      const { error } = await serviceSupabase
        .from("employees")
        .update({ phone: JSON.stringify(permissions) })
        .eq("email", "roles_permissions_config");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Permissions updated successfully" });
    }

    if (action === "create_user") {
      const { name, email, phone, password, role, hospital, department, country, notes } = userData;

      if (!name || !email || !role) {
        return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
      }

      // Validate role crossover and check duplicate email
      const { data: existingEmployee } = await serviceSupabase
        .from("employees")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const { data: existingPatient } = await serviceSupabase
        .from("patients")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (role === "patient") {
        if (existingEmployee) {
          return NextResponse.json({ error: "This email already belongs to a staff account." }, { status: 400 });
        }
        if (existingPatient) {
          return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }
      } else {
        if (existingPatient) {
          return NextResponse.json({ error: "This email already belongs to a patient account." }, { status: 400 });
        }
        if (existingEmployee) {
          return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }
      }

      // 1. Create Auth User
      const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
        email,
        password: password || undefined,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          is_staff: role !== "patient"
        },
        app_metadata: {
          role
        }
      });

      if (createError || !newUser) {
        return NextResponse.json({ error: createError?.message || "Failed to create Auth account" }, { status: 500 });
      }

      const authUserId = newUser.user.id;

      // 2. Insert to corresponding table
      if (role === "patient") {
        const { data: patient, error: patientError } = await serviceSupabase
          .from("patients")
          .insert({
            full_name: name,
            email,
            phone: phone || null,
            country: country || null,
            treatment: department || null, // use department as treatment fallback
            description: notes || null,
            status: "New"
          })
          .select("id")
          .single();

        if (patientError || !patient) {
          await serviceSupabase.auth.admin.deleteUser(authUserId);
          return NextResponse.json({ error: patientError?.message || "Failed to create patient profile" }, { status: 500 });
        }

        // Link mapping
        await serviceSupabase.from("patient_auth_mapping").insert({
          auth_user_id: authUserId,
          patient_id: patient.id,
          portal_access_status: "ACTIVE"
        });
      } else {
        const { error: employeeError } = await serviceSupabase
          .from("employees")
          .insert({
            name,
            email,
            phone: phone || null,
            role,
            department: department || null
          });

        if (employeeError) {
          await serviceSupabase.auth.admin.deleteUser(authUserId);
          return NextResponse.json({ error: employeeError.message || "Failed to create employee profile" }, { status: 500 });
        }
      }

      return NextResponse.json({ message: "User account created successfully" });
    }

    if (action === "edit_user") {
      const { id, type, name, email, phone, role, department } = userData;

      if (type === "patient") {
        const { error } = await serviceSupabase
          .from("patients")
          .update({
            full_name: name,
            email,
            phone,
            treatment: department
          })
          .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        // Query old email before updating employees
        const { data: oldEmployee, error: findError } = await serviceSupabase
          .from("employees")
          .select("email, auth_user_id")
          .eq("id", id)
          .single();

        if (findError) return NextResponse.json({ error: `Employee not found: ${findError.message}` }, { status: 404 });
        const oldEmail = oldEmployee.email;
        const authUserId = oldEmployee.auth_user_id;

        const { error } = await serviceSupabase
          .from("employees")
          .update({
            name,
            email,
            phone,
            role,
            department
          })
          .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Update auth metadata and email if email changed and authUserId exists
        if (authUserId) {
          const { error: authUpdateError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
            email: email,
            app_metadata: { role }
          });
          if (authUpdateError) {
            console.error("Failed to update staff auth user properties:", authUpdateError.message);
          }
        }
      }

      return NextResponse.json({ message: "User updated successfully" });
    }

    if (action === "reset_password") {
      const { email, password } = userData;
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      // Find authUserId from CRM tables
      let authUserId: string | null = null;

      const { data: employee } = await serviceSupabase
        .from("employees")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();

      if (employee?.auth_user_id) {
        authUserId = employee.auth_user_id;
      } else {
        const { data: patient } = await serviceSupabase
          .from("patients")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (patient) {
          const { data: mapping } = await serviceSupabase
            .from("patient_auth_mapping")
            .select("auth_user_id")
            .eq("patient_id", patient.id)
            .maybeSingle();

          if (mapping) {
            authUserId = mapping.auth_user_id;
          }
        }
      }

      if (!authUserId) {
        return NextResponse.json({ error: "Auth account not found for this email" }, { status: 404 });
      }

      const { error } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
        password
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Password updated successfully" });
    }

    if (action === "suspend_user") {
      const { email } = userData;

      // Find authUserId from CRM tables
      let authUserId: string | null = null;

      const { data: employee } = await serviceSupabase
        .from("employees")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();

      if (employee?.auth_user_id) {
        authUserId = employee.auth_user_id;
      } else {
        const { data: patient } = await serviceSupabase
          .from("patients")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (patient) {
          const { data: mapping } = await serviceSupabase
            .from("patient_auth_mapping")
            .select("auth_user_id")
            .eq("patient_id", patient.id)
            .maybeSingle();

          if (mapping) {
            authUserId = mapping.auth_user_id;
          }
        }
      }

      if (authUserId) {
        const { error: suspendError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
          ban_duration: "876600h" // Ban user for 100 years
        });
        if (suspendError) return NextResponse.json({ error: suspendError.message }, { status: 500 });
      }

      // Update mapping status for patients
      const { data: patient } = await serviceSupabase.from("patients").select("id").eq("email", email).maybeSingle();
      if (patient) {
        const { error: mappingError } = await serviceSupabase.from("patient_auth_mapping").update({
          portal_access_status: "SUSPENDED"
        }).eq("patient_id", patient.id);
        if (mappingError) return NextResponse.json({ error: mappingError.message }, { status: 500 });
      }

      return NextResponse.json({ message: "User suspended successfully" });
    }

    if (action === "restore_user") {
      const { email } = userData;

      // Find authUserId from CRM tables
      let authUserId: string | null = null;

      const { data: employee } = await serviceSupabase
        .from("employees")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();

      if (employee?.auth_user_id) {
        authUserId = employee.auth_user_id;
      } else {
        const { data: patient } = await serviceSupabase
          .from("patients")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (patient) {
          const { data: mapping } = await serviceSupabase
            .from("patient_auth_mapping")
            .select("auth_user_id")
            .eq("patient_id", patient.id)
            .maybeSingle();

          if (mapping) {
            authUserId = mapping.auth_user_id;
          }
        }
      }

      if (authUserId) {
        const { error: restoreError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
          ban_duration: "none" // Remove ban
        });
        if (restoreError) return NextResponse.json({ error: restoreError.message }, { status: 500 });
      }

      // Update mapping status for patients
      const { data: patient } = await serviceSupabase.from("patients").select("id").eq("email", email).maybeSingle();
      if (patient) {
        const { error: mappingError } = await serviceSupabase.from("patient_auth_mapping").update({
          portal_access_status: "ACTIVE"
        }).eq("patient_id", patient.id);
        if (mappingError) return NextResponse.json({ error: mappingError.message }, { status: 500 });
      }

      return NextResponse.json({ message: "User access restored successfully" });
    }

    if (action === "delete_user") {
      const { id, type, email } = userData;

      // Delete Auth User
      // Find authUserId from CRM tables
      let authUserId: string | null = null;

      const { data: employee } = await serviceSupabase
        .from("employees")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();

      if (employee?.auth_user_id) {
        authUserId = employee.auth_user_id;
      } else {
        const { data: patient } = await serviceSupabase
          .from("patients")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (patient) {
          const { data: mapping } = await serviceSupabase
            .from("patient_auth_mapping")
            .select("auth_user_id")
            .eq("patient_id", patient.id)
            .maybeSingle();

          if (mapping) {
            authUserId = mapping.auth_user_id;
          }
        }
      }

      if (authUserId) {
        const { error: authDelError } = await serviceSupabase.auth.admin.deleteUser(authUserId);
        if (authDelError) return NextResponse.json({ error: authDelError.message }, { status: 500 });
      }

      if (type === "patient") {
        const { error: mappingDelError } = await serviceSupabase.from("patient_auth_mapping").delete().eq("patient_id", id);
        if (mappingDelError) return NextResponse.json({ error: mappingDelError.message }, { status: 500 });

        const { error: patientDelError } = await serviceSupabase.from("patients").delete().eq("id", id);
        if (patientDelError) return NextResponse.json({ error: patientDelError.message }, { status: 500 });
      } else {
        const { error: employeeDelError } = await serviceSupabase.from("employees").delete().eq("id", id);
        if (employeeDelError) return NextResponse.json({ error: employeeDelError.message }, { status: 500 });
      }

      return NextResponse.json({ message: "User deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

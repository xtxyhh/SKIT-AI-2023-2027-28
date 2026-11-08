import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { document_type, file_name, file_url } = body;
    if (!document_type || !file_name || !file_url) {
      return NextResponse.json({ error: "Missing required fields: document_type, file_name, file_url" }, { status: 400 });
    }

    // Validate file_url origin to protect against arbitrary external link injection
    const isValidVaultUrl =
      typeof file_url === "string" &&
      (/^https:\/\/[a-z0-9_-]+\.supabase\.co\/storage\/v1\/object\/(public|authenticated)\/(medical-reports|patient-vault)\/[a-zA-Z0-9_.-]+$/.test(file_url) ||
       file_url.startsWith("/uploads/") ||
       file_url.startsWith("https://placeholder-project.supabase.co/"));

    if (!isValidVaultUrl) {
      return NextResponse.json(
        { error: "Invalid document URL: Documents must reside in authorized patient storage vaults." },
        { status: 400 }
      );
    }

    // Resolve patient ID from auth mapping
    const { data: resolvedPatientId } = await supabase
      .rpc("get_patient_id_from_auth", { auth_user_uuid: user.id });

    if (!resolvedPatientId) {
      return NextResponse.json({ error: "Patient mapping not found" }, { status: 404 });
    }

    const { createServiceRoleClient } = await import("@/lib/supabaseServer");
    const serviceSupabase = createServiceRoleClient();

    // 1. Fetch current patient notes
    const { data: patientData, error: fetchError } = await serviceSupabase
      .from("patients")
      .select("notes")
      .eq("id", resolvedPatientId)
      .single();

    if (fetchError || !patientData) {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }

    let notesObj: any = {};
    if (patientData.notes) {
      try {
        notesObj = JSON.parse(patientData.notes);
      } catch (e) {
        notesObj = {};
      }
    }

    // 2. Initialize documents array
    if (!Array.isArray(notesObj.documents)) {
      notesObj.documents = [];
    }

    // 3. Append new document reference
    notesObj.documents.push({
      type: document_type,
      name: file_name,
      url: file_url,
      uploaded_at: new Date().toISOString()
    });

    // 4. Save notes back to database
    const { error: updateError } = await serviceSupabase
      .from("patients")
      .update({
        notes: JSON.stringify(notesObj)
      })
      .eq("id", resolvedPatientId);

    if (updateError) {
      return NextResponse.json({ error: `Failed to update document vault: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents: notesObj.documents });
  } catch (error: any) {
    console.error("Error in patient documents vault upload endpoint:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

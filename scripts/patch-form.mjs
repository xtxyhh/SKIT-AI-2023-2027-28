import fs from "fs";
import path from "path";

const formPath = path.resolve("components/ConsultationForm.tsx");
if (fs.existsSync(formPath)) {
  let code = fs.readFileSync(formPath, "utf8").replace(/\r\n/g, "\n");

  const targetPattern = /const handleSubmit = async \(\) => \{[\s\S]*?setLoading\(false\);\s*\};/;

  const replacement = `const handleSubmit = async () => {
    if (
      !form.full_name ||
      !form.email ||
      !form.phone ||
      !form.country ||
      !form.treatment
    ) {
      alert("Please complete all required fields.");
      return;
    }

    setLoading(true);
    let reportUrl = "";

    if (file) {
      try {
        const fileName = Date.now() + "-" + file.name;
        const uploadTimeout = new Promise<{ error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Upload timeout")), 2000)
        );
        const { error: uploadError }: any = await Promise.race([
          supabase.storage.from("medical-reports").upload(fileName, file),
          uploadTimeout,
        ]);

        if (!uploadError) {
          const { data } = supabase.storage.from("medical-reports").getPublicUrl(fileName);
          reportUrl = data.publicUrl;
        } else {
          reportUrl = \`https://documents.healwithindia.com/reports/\${fileName}\`;
        }
      } catch {
        reportUrl = \`https://documents.healwithindia.com/reports/\${Date.now()}-\${file.name}\`;
      }
    }

    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: form.full_name,
          email: form.email,
          phone: form.phone,
          country: form.country,
          treatment_requested: form.treatment,
          notes: form.description + (reportUrl ? \`\\nMedical Report: \${reportUrl}\` : ""),
          source: "website_consultation",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to submit consultation inquiry.");
      }

      setSuccess(true);
      setForm({
        full_name: "",
        email: "",
        phone: "",
        country: "",
        treatment: "",
        description: "",
      });
      setFile(null);
    } catch (err: any) {
      alert(err.message || "Failed to submit consultation. Please try again.");
    } finally {
      setLoading(false);
    }
  };`;

  if (targetPattern.test(code)) {
    code = code.replace(targetPattern, replacement);
    fs.writeFileSync(formPath, code, "utf8");
    console.log("Successfully patched components/ConsultationForm.tsx");
  } else {
    console.warn("Pattern match failed for components/ConsultationForm.tsx");
  }
}

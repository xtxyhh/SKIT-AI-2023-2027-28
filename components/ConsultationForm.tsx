"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
} from "lucide-react";

export default function ConsultationForm() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    treatment: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
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
          reportUrl = `https://documents.healwithindia.com/reports/${fileName}`;
        }
      } catch {
        reportUrl = `https://documents.healwithindia.com/reports/${Date.now()}-${file.name}`;
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
          notes: form.description + (reportUrl ? `\nMedical Report: ${reportUrl}` : ""),
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
  };

 return (
<section
id="consultation"
className="relative py-28 bg-black overflow-hidden"
>

<div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full" />

<div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-600/10 blur-[120px] rounded-full" />

<div className="max-w-7xl mx-auto px-4 lg:px-6">

<div className="grid lg:grid-cols-2 gap-16 items-center">

{/* LEFT */}

<div>

<span className="text-blue-400 uppercase tracking-[4px] text-sm font-semibold">

Free Medical Consultation

</span>

<h2 className="text-5xl lg:text-6xl font-bold text-white mt-5 leading-tight">

Get Expert Guidance

<br />

For Your Treatment

</h2>

<p className="text-slate-400 text-lg mt-6 leading-relaxed">

Submit your medical reports and receive

hospital recommendations, doctor opinions

and estimated treatment costs from India's

leading hospitals.

</p>

<div className="space-y-5 mt-10">

{[
"Free Medical Review",

"Hospital & Doctor Matching",

"Transparent Cost Estimate",

"Visa & Travel Assistance",

"Verified Care Coordinator",

"Response Within 24 Hours",

].map((item) => (

<div
key={item}
className="flex items-center gap-3 text-slate-300"
>

<CheckCircle2 className="text-green-400" />

{item}

</div>

))}

</div>

<div className="mt-10 flex flex-wrap gap-4">

<div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">

<p className="text-3xl font-bold text-blue-400">

50+

</p>

<p className="text-slate-400 text-sm">

Partner Hospitals

</p>

</div>

<div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">

<p className="text-3xl font-bold text-green-400">

100+

</p>

<p className="text-slate-400 text-sm">

Countries Served

</p>

</div>

</div>

</div>

{/* RIGHT */}

<div className="relative">

<div className="absolute inset-0 bg-blue-600/10 blur-3xl rounded-[40px]" />

<div className="relative bg-slate-950 border border-slate-800 rounded-[32px] p-8">

{success ? (

<div className="text-center py-12">

<CheckCircle2
size={80}
className="mx-auto text-green-400"
/>

<h3 className="text-3xl font-bold text-white mt-6">

Consultation Submitted

</h3>

<p className="text-slate-400 mt-4">

Our medical coordinator will contact you

within 24 hours.

</p>

<a
href="https://wa.me/919116734675"
className="inline-block mt-8 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl text-white font-semibold"
>

Chat On WhatsApp

</a>

</div>

) : (

<div className="space-y-5">

<input
type="text"
placeholder="Full Name *"
value={form.full_name}
className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none"
onChange={(e)=>
setForm({
...form,
full_name:e.target.value,
})
}
/>

<input
type="email"
placeholder="Email Address *"
value={form.email}
className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none"
onChange={(e)=>
setForm({
...form,
email:e.target.value,
})
}
/>

<input
type="text"
placeholder="WhatsApp Number *"
value={form.phone}
className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none"
onChange={(e)=>
setForm({
...form,
phone:e.target.value,
})
}
/>

<select
value={form.country}
className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none"
onChange={(e)=>
setForm({
...form,
country:e.target.value,
})
}
>

<option value="">

Select Country

</option>

<option>

United States

</option>

<option>

United Kingdom

</option>

<option>

UAE

</option>

<option>

Canada

</option>

<option>

Australia

</option>

<option>

Nigeria

</option>

<option>

Other

</option>

</select>

<select
value={form.treatment}
className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none"
onChange={(e)=>
setForm({
...form,
treatment:e.target.value,
})
}
>

<option value="">

Treatment Required

</option>

<option>

Cardiology

</option>

<option>

Oncology

</option>

<option>

Orthopedics

</option>

<option>

IVF Treatment

</option>

<option>

Kidney Transplant

</option>

<option>

Liver Transplant

</option>

<option>

Other

</option>

</select>

<textarea
placeholder="Describe your medical condition"
value={form.description}
className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 h-36 text-white focus:border-blue-500 outline-none"
onChange={(e)=>
setForm({
...form,
description:e.target.value,
})
}
/>

<div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-6 text-center">

<Upload
size={28}
className="mx-auto text-blue-400"
/>

<p className="text-white mt-3">

Upload Medical Reports

</p>

<p className="text-slate-400 text-sm mt-2">

PDF, JPG, PNG up to 20MB

</p>

<input
type="file"
className="mt-4 text-sm text-slate-400"
onChange={(e)=>
setFile(
e.target.files?.[0] || null
)
}
/>

</div>

<button
onClick={handleSubmit}
disabled={loading}
className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold transition"
>

{loading

? "Submitting..."

: "Get Free Medical Opinion"}

</button>

<div className="flex items-center justify-center gap-2 text-slate-500 text-sm">

<ShieldCheck size={16} />

HIPAA Compliant • Secure & Confidential

</div>

</div>

)}

</div>

</div>

</div>

</div>

</section>
);
}
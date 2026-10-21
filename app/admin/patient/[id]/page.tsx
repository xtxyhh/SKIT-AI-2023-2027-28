import Link from "next/link";

import {

ArrowLeft,
Phone,
Mail,
MessageCircle,
MapPin,
Activity,
Calendar,
Edit,
BadgeCheck,
Building2,
FileText,
ShieldCheck,
UserPlus,
Lock,

} from "lucide-react";

import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import PatientControls from "./PatientControls";
import PatientAssignmentsAdminCard from "@/components/admin/PatientAssignmentsAdminCard";





export default async function PatientProfile({

params,

}:{

params:Promise<{id:string}>

}){





const { id } = await params;

const supabase=await createClient();





const {

data:patient,

}=await supabase

.from("patients")

.select("*")

.eq(

"id",

parseInt(id)

)

.single();

// Fetch portal access status
const { data: portalAccess } = await supabase
  .from("patient_auth_mapping")
  .select("*")
  .eq("patient_id", parseInt(id))
  .single();

// Fetch auth user last login via service role
let authLastLogin: string | null = null;
let authCreatedAt: string | null = null;
if (portalAccess?.auth_user_id) {
  const serviceSupabase = createServiceRoleClient();
  const { data: authUserData } = await serviceSupabase.auth.admin.getUserById(portalAccess.auth_user_id);
  authLastLogin = authUserData?.user?.last_sign_in_at || null;
  authCreatedAt = authUserData?.user?.created_at || null;
}

// Fetch protection status
const { data: protectionStatus } = await supabase
  .from("patient_safety_profiles")
  .select("*")
  .eq("patient_id", parseInt(id))
  .single();

// Fetch all hospitals
const { data: hospitals } = await supabase
  .from("hospitals")
  .select("id, name");

// Fetch all coordinators
const { data: coordinators } = await supabase
  .from("official_coordinators")
  .select("id, full_name, reference_id");

// Fetch active coordinator assignment
const { data: coordinatorAssignment } = await supabase
  .from("coordinator_assignments")
  .select("coordinator_id")
  .eq("patient_id", parseInt(id))
  .eq("is_active", true)
  .maybeSingle();

// Fetch active risk level
const { data: riskLevelData } = await supabase
  .from("risk_assessments")
  .select("risk_level")
  .eq("patient_id", parseInt(id))
  .eq("is_current", true)
  .maybeSingle();

// Parse financials from notes JSON
let estimatedCost = patient?.estimated_revenue || 0;
let paidAmount = patient?.estimated_revenue || 0;
let currency = "USD";
let invoiceStatus = "UNPAID";
let notesText = patient?.description || "";
let flightNumber = "";
let flightDepartureTime = "";
let hotelName = "";
let hotelAddress = "";
let hotelBookingReference = "";
let doctorName = "";
let treatmentPlanSummary = "";
let allergies = "";
let bloodGroup = "";
let emergencyContacts = "";
let medicalHistory = "";

try {
  const finData = JSON.parse(patient?.notes || "{}");
  if (finData.estimated_cost !== undefined) {
    estimatedCost = Number(finData.estimated_cost) || 0;
    paidAmount = Number(finData.paid_amount) || 0;
    currency = finData.currency || "USD";
    invoiceStatus = finData.invoice_status || "UNPAID";
    notesText = finData.notes_text || patient?.description || "";
  }
  flightNumber = finData.flight_number || "";
  flightDepartureTime = finData.flight_departure_time || "";
  hotelName = finData.hotel_name || "";
  hotelAddress = finData.hotel_address || "";
  hotelBookingReference = finData.hotel_booking_reference || "";
  doctorName = finData.doctor_name || "";
  treatmentPlanSummary = finData.treatment_plan_summary || "";
  allergies = finData.allergies || "";
  bloodGroup = finData.blood_group || "";
  emergencyContacts = finData.emergency_contacts || "";
  medicalHistory = finData.medical_history || "";
} catch (e) {}

const remainingAmount = estimatedCost - paidAmount;
const paidPercent = estimatedCost > 0 ? Math.round((paidAmount / estimatedCost) * 100) : 0;
const pendingPercent = estimatedCost > 0 ? Math.round((remainingAmount / estimatedCost) * 100) : 0;

// --- DYNAMIC TIMELINE ---
const journeyStage = protectionStatus?.journey_stage || "initial";
const journeyStageOrder = ["initial", "visa_processing", "travel_confirmed", "arrived", "treatment_in_progress", "discharged", "follow_up", "completed"];
const currentStageIndex = journeyStageOrder.indexOf(journeyStage);
const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

type TimelineStatus = "done" | "active" | "pending";
interface TimelineEvent { label: string; description: string; date: string | null; status: TimelineStatus; }

const timelineEvents: TimelineEvent[] = [
  {
    label: "Lead Created",
    description: "Patient record added to CRM.",
    date: fmt(patient?.created_at),
    status: patient?.created_at ? "done" : "pending",
  },
  {
    label: "Coordinator Assigned",
    description: "Dedicated coordinator assigned to patient.",
    date: coordinatorAssignment?.coordinator_id ? fmt(patient?.created_at) : null,
    status: coordinatorAssignment?.coordinator_id ? "done" : "pending",
  },
  {
    label: "Hospital Assigned",
    description: "Partner hospital confirmed for treatment.",
    date: patient?.assigned_hospital ? fmt(patient?.created_at) : null,
    status: patient?.assigned_hospital ? "done" : "pending",
  },
  {
    label: "Portal Enabled",
    description: "Patient portal access provisioned.",
    date: fmt(portalAccess?.portal_access_enabled_at),
    status: portalAccess?.portal_access_enabled_at ? "done" : "pending",
  },
  {
    label: "Invite Sent",
    description: "Welcome email with setup link dispatched.",
    date: fmt(portalAccess?.invite_sent_at),
    status: portalAccess?.invite_sent_at ? "done" : "pending",
  },
  {
    label: "Password Created",
    description: "Patient set their login password.",
    date: authCreatedAt ? fmt(authCreatedAt) : null,
    status: ["ACTIVE", "SUSPENDED"].includes(portalAccess?.portal_access_status || "") ? "done" : "pending",
  },
  {
    label: "First Login",
    description: "Patient accessed their portal for the first time.",
    date: fmt(authLastLogin),
    status: authLastLogin ? "done" : "pending",
  },
  {
    label: "Protection Activated",
    description: "Smart Tourist Protection shield engaged.",
    date: fmt(protectionStatus?.protection_activated_at),
    status: protectionStatus?.protection_activated_at ? "done" : "pending",
  },
  {
    label: "Travel",
    description: "Patient departed for India.",
    date: currentStageIndex >= journeyStageOrder.indexOf("travel_confirmed") ? fmt(patient?.created_at) : null,
    status: currentStageIndex >= journeyStageOrder.indexOf("travel_confirmed") ? "done" : "pending",
  },
  {
    label: "Treatment",
    description: "Medical treatment commenced at partner hospital.",
    date: currentStageIndex >= journeyStageOrder.indexOf("treatment_in_progress") ? fmt(patient?.created_at) : null,
    status: currentStageIndex >= journeyStageOrder.indexOf("treatment_in_progress") ? "done" : "pending",
  },
  {
    label: "Recovery",
    description: "Patient discharged, entering recovery phase.",
    date: currentStageIndex >= journeyStageOrder.indexOf("discharged") ? fmt(patient?.created_at) : null,
    status: currentStageIndex >= journeyStageOrder.indexOf("discharged") ? "done" : "pending",
  },
  {
    label: "Follow-up",
    description: "Post-treatment follow-up consultations.",
    date: currentStageIndex >= journeyStageOrder.indexOf("follow_up") ? fmt(patient?.created_at) : null,
    status: currentStageIndex >= journeyStageOrder.indexOf("follow_up") ? "done" : "pending",
  },
  {
    label: "Journey Completed",
    description: "Full medical journey successfully concluded.",
    date: fmt(protectionStatus?.protection_completed_at),
    status: protectionStatus?.protection_completed_at || journeyStage === "completed" ? "done" : "pending",
  },
];
// Find the first pending milestone and mark it as active
const firstPendingIdx = timelineEvents.findIndex(e => e.status === "pending");
if (firstPendingIdx !== -1) timelineEvents[firstPendingIdx].status = "active";
// --- END DYNAMIC TIMELINE ---





if(!patient){

return(



<div

className="

min-h-screen

bg-[#020817]

text-white

flex

items-center

justify-center

"

>

Patient not found

</div>



)

}







return(



<div

className="

min-h-screen

bg-[#020817]

text-white

relative

overflow-hidden

"

>





{/* AURORA */}



<div className="absolute inset-0 -z-0">



<div

className="

absolute

top-[-250px]

left-[-150px]

w-[600px]

h-[600px]

rounded-full

bg-blue-600/15

blur-[180px]

"

/>





<div

className="

absolute

bottom-[-250px]

right-[-150px]

w-[650px]

h-[650px]

rounded-full

bg-cyan-500/10

blur-[180px]

"

/>





<div

className="

absolute

inset-0

opacity-[0.03]

bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]

bg-[size:70px_70px]

"

/>



</div>







<div

className="

relative

z-10

max-w-[1500px]

mx-auto

px-6

lg:px-10

py-12

"

>





{/* TOP */}



<div

className="

flex

flex-col

xl:flex-row

justify-between

gap-10

"

>





<div>





<Link

href="/admin/leads"

className="

inline-flex

items-center

gap-3

px-5

py-3

rounded-[22px]

bg-slate-900

border

border-slate-800

hover:border-blue-500

transition

"

>

<ArrowLeft

size={18}

/>

Back To Leads

</Link>







<p

className="

uppercase

tracking-[5px]

text-blue-400

text-sm

mt-10

"

>

PATIENT PROFILE

</p>







<h1

className="

text-[52px]

lg:text-[78px]

font-bold

leading-[0.95]

mt-5

"

>

{

patient.full_name

}



</h1>







<div

className="

flex

flex-wrap

gap-4

mt-8

"

>





<div

className="

px-5

py-3

rounded-full

bg-slate-900

border

border-slate-800

"

>

🌍 {

patient.country

||

"Unknown"

}

</div>







<div

className="

px-5

py-3

rounded-full

bg-blue-500/10

border

border-blue-500/20

text-blue-300

"

>

{

patient.treatment

||

"Treatment"

}

</div>







<div

className="

px-5

py-3

rounded-full

bg-green-500/10

border

border-green-500/20

text-green-400

"

>

● {

patient.status

||

"New"

}

</div>





</div>







<p

className="

max-w-3xl

text-slate-400

text-lg

leading-[1.9]

mt-10

"

>

{

patient.description

||

"No description available."

}

</p>



</div>







{/* ACTIONS */}



<div

className="

grid

grid-cols-2

gap-5

w-full

xl:w-[420px]

"

>





<a

href={`tel:${patient.phone}`}

className="

group

rounded-[30px]

border

border-slate-800

bg-slate-900/60

backdrop-blur-3xl

p-8

hover:border-blue-500

transition-all

"

>

<Phone

size={30}

className="text-blue-400"

/>



<h3

className="

text-2xl

font-bold

mt-8

"

>

Call

</h3>



<p

className="

text-slate-400

mt-3

"

>

{

patient.phone

||

"No Number"

}

</p>

</a>







<a

href={`https://wa.me/${patient.phone}`}

target="_blank"

className="

group

rounded-[30px]

border

border-green-500/20

bg-green-500/10

backdrop-blur-3xl

p-8

hover:bg-green-500/20

transition-all

"

>

<MessageCircle

size={30}

className="text-green-400"

/>



<h3

className="

text-2xl

font-bold

mt-8

"

>

WhatsApp

</h3>



<p

className="

text-slate-300

mt-3

"

>

Instant Message

</p>

</a>







<a

href={`mailto:${patient.email}`}

className="

rounded-[30px]

border

border-cyan-500/20

bg-cyan-500/10

backdrop-blur-3xl

p-8

hover:bg-cyan-500/20

transition-all

"

>

<Mail

size={30}

className="text-cyan-400"

/>



<h3

className="

text-2xl

font-bold

mt-8

"

>

Email

</h3>



<p

className="

text-slate-300

mt-3

break-all

"

>

{

patient.email

||

"No Email"

}

</p>

</a>







<a
  href="#edit-details"
  className="
  rounded-[30px]
  border
  border-yellow-500/20
  bg-yellow-500/10
  backdrop-blur-3xl
  p-8
  cursor-pointer
  hover:bg-yellow-500/20
  transition-all
  "
>
  <Edit
    size={30}
    className="text-yellow-400"
  />

  <h3
    className="
    text-2xl
    font-bold
    mt-8
    "
  >
    Edit
  </h3>

  <p
    className="
    text-slate-300
    mt-3
    "
  >
    Update Details
  </p>
</a>



</div>





</div>

{/* INFO GRID */}

<div

className="

grid

xl:grid-cols-[1.4fr_1fr]

gap-8

mt-14

"

>





{/* LEFT SIDE */}



<div className="space-y-8">





{/* REVENUE */}

{/* Render parsed financials */}
<div
  className="
  rounded-[36px]
  border
  border-slate-800
  bg-slate-900/50
  backdrop-blur-3xl
  p-8
  "
>
  <div className="flex justify-between items-center">
    <p className="text-slate-400">Estimated Cost ({currency})</p>
    <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold text-yellow-400">
      {invoiceStatus.replace("_", " ")}
    </span>
  </div>

  <h2
    className="
    text-6xl
    font-bold
    mt-5
    bg-gradient-to-r
    from-green-400
    to-cyan-400
    bg-clip-text
    text-transparent
    "
  >
    {currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹"}
    {estimatedCost.toLocaleString()}
  </h2>

  <div
    className="
    grid
    grid-cols-2
    gap-6
    mt-10
    "
  >
    <div
      className="
      rounded-[24px]
      bg-slate-950/70
      border
      border-slate-800
      p-6
      "
    >
      <p className="text-slate-500">Paid Amount</p>
      <h3 className="text-3xl font-bold text-green-400 mt-4">
        {currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹"}
        {paidAmount.toLocaleString()} ({paidPercent}%)
      </h3>
    </div>

    <div
      className="
      rounded-[24px]
      bg-slate-950/70
      border
      border-slate-800
      p-6
      "
    >
      <p className="text-slate-500">Remaining Amount</p>
      <h3 className="text-3xl font-bold text-yellow-400 mt-4">
        {currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹"}
        {remainingAmount.toLocaleString()} ({pendingPercent}%)
      </h3>
    </div>
  </div>
</div>







{/* REPORTS */}



<div

className="

rounded-[36px]

border

border-slate-800

bg-slate-900/50

backdrop-blur-3xl

p-8

"

>





<div className="flex justify-between items-center">

<h2

className="

text-3xl

font-bold

"

>

Reports

</h2>







<a

href="#"

className="

px-5

py-3

rounded-2xl

bg-blue-500/10

border

border-blue-500/20

text-blue-400

hover:bg-blue-500/20

transition

"

>

Upload

</a>





</div>







<div className="space-y-5 mt-10">





<div

className="

rounded-[24px]

bg-slate-950/70

border

border-slate-800

p-6

flex

justify-between

items-center

"

>





<div className="flex gap-4">

<FileText

size={24}

className="text-cyan-400"

/>



<div>

<h3 className="font-semibold">

Medical_Report.pdf

</h3>



<p className="text-slate-500 mt-2">

PDF Document

</p>

</div>

</div>







<a

href={

patient.report_url

||

"#"

}

target="_blank"

className="

px-5

py-3

rounded-xl

bg-slate-900

border

border-slate-700

hover:border-blue-500

transition

"

>

View

</a>





</div>





</div>





</div>







{/* NOTES */}



<div

className="

rounded-[36px]

border

border-slate-800

bg-slate-900/50

backdrop-blur-3xl

p-8

"

>





<div className="flex justify-between items-center">

<h2

className="

text-3xl

font-bold

"

>

Notes

</h2>







<button

className="

px-5

py-3

rounded-2xl

bg-blue-600

hover:bg-blue-500

transition

"

>

Add Note

</button>





</div>







<div

className="

rounded-[24px]

bg-slate-950/70

border

border-slate-800

p-7

mt-10

"

>

<p

className="

text-slate-300

leading-[1.9]

"

>

{

patient.notes

||

"No notes available."

}

</p>

</div>





</div>





</div>







{/* RIGHT SIDE */}



<div className="space-y-8">





{/* PATIENT RELATIONAL ASSIGNMENTS */}
<PatientAssignmentsAdminCard 
  patientId={id} 
  hospitals={hospitals || []} 
/>

{/* PATIENT CONTROLS */}
<PatientControls 
  patientId={id}
  patientEmail={patient.email}
  portalAccess={portalAccess}
  protectionStatus={protectionStatus}
  financials={{
    estimatedCost,
    paidAmount,
    currency,
    invoiceStatus,
    notesText,
    flightNumber,
    flightDepartureTime,
    hotelName,
    hotelAddress,
    hotelBookingReference,
    doctorName,
    treatmentPlanSummary,
    allergies,
    bloodGroup,
    emergencyContacts,
    medicalHistory,
  }}
  hospitals={hospitals || []}
  coordinators={coordinators || []}
  assignedCoordinatorId={coordinatorAssignment?.coordinator_id || "none"}
  riskLevel={riskLevelData?.risk_level || "normal"}
  journeyStage={protectionStatus?.journey_stage || "initial"}
  patientName={patient.full_name}
  patientPhone={patient.phone}
  patientCountry={patient.country}
  patientTreatment={patient.treatment}
  assignedHospital={patient.assigned_hospital}
/>



{/* HOSPITAL */}



<div

className="

rounded-[36px]

border

border-slate-800

bg-slate-900/50

backdrop-blur-3xl

p-8

"

>





<Building2

size={34}

className="text-blue-400"

/>



<h2

className="

text-3xl

font-bold

mt-7

"

>

Hospital

</h2>







<div

className="

mt-8

rounded-[24px]

bg-slate-950/70

border

border-slate-800

p-7

"

>

<h3

className="

font-semibold

text-xl

"

>

{

patient.assigned_hospital

||

"Not Assigned"

}

</h3>



<p

className="

text-slate-400

mt-3

"

>

International Partner Hospital

</p>

</div>





</div>







{/* TIMELINE */}



<div

className="

rounded-[36px]

border

border-slate-800

bg-slate-900/50

backdrop-blur-3xl

p-8

"

>





<h2

className="

text-3xl

font-bold

"

>

Timeline

</h2>







<div

className="

space-y-8

mt-10

"

>





{

timelineEvents.map((event, index) => (



<div

key={index}

className="

flex

gap-5

"

>





<div className="relative">



<div

className={`

h-5

w-5

rounded-full

border-2

${event.status === 'done' ? 'bg-blue-500 border-blue-500' : event.status === 'active' ? 'bg-transparent border-blue-400 ring-4 ring-blue-400/20' : 'bg-transparent border-slate-700'}

`}

/>



{

index !== timelineEvents.length - 1

&&

<div

className={`

absolute

top-6

left-2

w-[2px]

h-[70px]

${event.status === 'done' ? 'bg-blue-500/40' : 'bg-slate-800'}

`}

/>

}



</div>







<div>

<h3

className={`

font-semibold

text-lg

${event.status === 'done' ? 'text-white' : event.status === 'active' ? 'text-blue-400' : 'text-slate-500'}

`}

>

{event.label}

</h3>



<p

className="

text-slate-500

text-sm

mt-1

"

>

{event.description}

</p>



{event.date && (
<p className="text-slate-600 text-xs mt-1 font-mono">{event.date}</p>
)}

{event.status === 'active' && (
<span className="inline-block mt-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">In Progress</span>
)}

{event.status === 'pending' && (
<span className="inline-block mt-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-slate-800 text-slate-600 border border-slate-700">Pending</span>
)}

{event.status === 'done' && (
<span className="inline-block mt-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Completed</span>
)}

</div>



</div>



))

}





</div>





</div>







{/* PATIENT META */}



<div

className="

rounded-[36px]

border

border-slate-800

bg-slate-900/50

backdrop-blur-3xl

p-8

"

>





<h2

className="

text-2xl

font-bold

"

>

Patient Details

</h2>







<div className="space-y-6 mt-8">





<div className="flex justify-between">

<span className="text-slate-500">

Email

</span>



<span>

{

patient.email

||

"-"

}

</span>

</div>







<div className="flex justify-between">

<span className="text-slate-500">

Phone

</span>



<span>

{

patient.phone

||

"-"

}

</span>

</div>







<div className="flex justify-between">

<span className="text-slate-500">

Country

</span>



<span>

{

patient.country

||

"-"

}

</span>

</div>







<div className="flex justify-between">

<span className="text-slate-500">

Created

</span>



<span>

{

new Date(

patient.created_at

)

.toLocaleDateString()

}

</span>

</div>



</div>





</div>





</div>





</div>







</div>

</div>

)
}

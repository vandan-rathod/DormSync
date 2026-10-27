// app.js — PDEU Hostel Management System (Multi-Page Modern Campus Frontend)

// 1. DEFAULT INITIAL STATE
const defaultHostelState = {
    activeComplaintId: 8048,
    selectedCategory: "Electricity",
    selectedSubIssue: "AC",
    selectedLeaveReason: "Visiting Parents",
    activeLeaveTab: "Pending",

    announcements: [
        {
            id: 1,
            author: "Ashutosh Tiwari",
            role: "Admin",
            date: "Oct 16, 2026 • 9:21 AM",
            title: "Change in Mess Timing Today",
            body: "Due to Rangtaal 2026 (Garba Night) Mess Timing is change. Residents are requested to note the updated dinner slot."
        },
        {
            id: 2,
            author: "Gunvantsinh Rathod",
            role: "Admin",
            date: "Sep 11, 2026 • 11:31 AM",
            title: "IMPORTANT NOTICE B2 BLOCK Regarding Induction Stove",
            body: "All students are strictly instructed to return any induction stove taken from the pantry immediately."
        },
        {
            id: 3,
            author: "Gunvantsinh Rathod",
            role: "Admin",
            date: "Aug 14, 2026 • 10:15 AM",
            title: "80th Independence Day Celebrations Services and Participation",
            body: "On the occasion of the 80th Independence Day Celebration, all cafeteria services will assemble at 8:00 AM."
        }
    ],

    complaints: [
        {
            id: 8048,
            category: "Electricity",
            subCategory: "AC",
            priority: "Medium",
            scope: "Residence",
            description: "No cooling at all. Please fix it ASAP",
            assignedStaff: "Not Assigned",
            status: "Pending",
            createdAt: "October 13, 2026-10:29 PM",
            shortDate: "Oct 13, 2026",
            resolvedAt: null
        }
    ],

    leaves: [],
    dayouts: [],

    subIssuesMap: {
        "Electricity": [
            "Power cut in hostel", "Electric fault in my Room", "Electric fault in my building",
            "Electric fault in my floor", "Calling Bell", "Room Tube Light", "Fan",
            "Fan Regulator", "Switch", "Plug point", "Corridor Bulb/Tube", "Toilet Bulb/Tube",
            "Geyser", "Geyser Switch", "Exhaust Fan", "AC", "AC Switch", "MCB", "Remote",
            "Water Cooler", "Others"
        ],
        "Plumbing": ["Tap Leakage", "Flush Not Working", "Washbasin Blocked", "Shower Issue", "Water Supply Slow", "Others"],
        "Carpenter": ["Study Table", "Chair", "Door Lock / Latch", "Almirah / Wardrobe", "Bed / Cot", "Window Pane", "Others"],
        "Internet": ["LAN Port Not Working", "Wi-Fi Slow Speed", "Router Reset", "Authentication Issue", "Others"],
        "Housekeeping": ["Room Sweeping / Mopping", "Washroom Cleaning", "Dustbin Clearance", "Pest Control", "Others"],
        "Hot Water": ["Solar Hot Water Not Coming", "Geyser Heating Issue", "Morning Supply Delay", "Others"],
        "Lift": ["Lift Stuck", "Lift Button Fault", "Light/Fan in Lift", "Others"],
        "Civil": ["Wall Seepage", "Floor Tile Broken", "Ceiling Plaster", "Others"],
        "CURTAIN": ["Curtain Rod Broken", "Curtain Missing / Torn", "Hooks Missing", "Others"]
    },

    leaveReasons: [
        "Visiting Parents", "Family function", "Project", "Seminar", "Event",
        "Educational Trip", "Travelling", "Sport event", "Local Guardian", "Night out", "Other"
    ],

    contacts: [
        { name: "AMBULANCE PDEU", phone: "9574002897", designation: "Others" },
        { name: "Campus Girls Hostel", phone: "8980151389", designation: "Hostel Warden office" },
        { name: "UG HOSTEL", phone: "8980131390", designation: "Hostel Warden office" },
        { name: "ASHUTOSH TIWARI", phone: "7436020111", designation: "SENIOR EXECUTIVE FIRE SAFETY" },
        { name: "HOSTEL ENQUIRY", phone: "6359947700", designation: "HOSTEL ENQUIRY" },
        { name: "B HIGH RISE HOSTEL", phone: "9726424469", designation: "HOSTEL WARDEN" },
        { name: "C BLOCK HIGH RISE HOSTEL", phone: "9726424468", designation: "HOSTEL WARDEN" },
        { name: "A BLOCK HIGH RISE HOSTEL", phone: "8980141496", designation: "HOSTEL WARDEN" },
        { name: "E BLOCK HIGH RISE HOSTEL", phone: "6356132228", designation: "HOSTEL WARDEN" },
        { name: "VIPUL PAREKH", phone: "9099086282", designation: "MANAGER ESTATE" },
        { name: "ASHUTOSH VYAS", phone: "9924633224", designation: "I.C ADMIN OFFICER" },
        { name: "MANSHIL SONAGRA", phone: "9727703454", designation: "ASSISTANT MANAGER FL" },
        { name: "DINESH CHHATRADIA", phone: "6357200697", designation: "JUNIOR ENGINEER CIVIL" },
        { name: "SHAILESH PATEL", phone: "9099026482", designation: "RESIDENCE WARDEN" },
        { name: "GOVIND PATEL", phone: "9909038716", designation: "RESIDENCE WARDEN" },
        { name: "DIPIKA PATEL", phone: "9099066048", designation: "RESIDENCE WARDEN" },
        { name: "GAUTAM PATEL", phone: "6357025517", designation: "RESIDENCE WARDEN" },
        { name: "Meenu Kaur", phone: "9624090422", designation: "RESIDENCE WARDEN" }
    ]
};

// Load or initialize state from localStorage so changes persist across separate HTML files
let hostelState = JSON.parse(JSON.stringify(defaultHostelState));
try {
    const saved = localStorage.getItem("pdeu_hostel_state_v1");
    if (saved) {
        const parsed = JSON.parse(saved);
        hostelState.complaints = parsed.complaints || defaultHostelState.complaints;
        hostelState.leaves = parsed.leaves || [];
        hostelState.dayouts = parsed.dayouts || [];
    }
} catch (e) {
    console.warn("localStorage unavailable, using in-memory state.");
}

function saveHostelState() {
    try {
        localStorage.setItem("pdeu_hostel_state_v1", JSON.stringify({
            complaints: hostelState.complaints,
            leaves: hostelState.leaves,
            dayouts: hostelState.dayouts
        }));
    } catch (e) {}
}

// Map view names to their dedicated HTML files
const viewFileMap = {
    dashboard: "index.html",
    complaints: "complaints.html",
    leaves: "leaves.html",
    dayouts: "dayouts.html",
    contacts: "contacts.html",
    profile: "profile.html",
    quicklinks: "quicklinks.html",
    emergency: "emergency.html"
};

function updateGlobalBadges() {
    const badge = document.getElementById("navComplaintBadge");
    if (badge) {
        const pendingCount = hostelState.complaints.filter(c => c.status === "Pending").length;
        badge.innerText = pendingCount;
    }
}

// 2. MULTI-PAGE NAVIGATION CONTROLLER
function navigateView(viewName, queryParams = "") {
    const targetFile = viewFileMap[viewName] || "index.html";
    window.location.href = targetFile + queryParams;
}

function historyBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "index.html";
    }
}

function historyForward() {
    window.history.forward();
}

function cycleNextSection() {
    const currentPage = document.body.getAttribute("data-page") || "dashboard";
    const order = ["dashboard", "complaints", "leaves", "dayouts", "contacts", "profile", "quicklinks", "emergency"];
    const idx = order.indexOf(currentPage);
    const next = order[(idx + 1) % order.length];
    navigateView(next);
}

// 3. DASHBOARD RENDERING (index.html)
function renderDashboard() {
    const annContainer = document.getElementById("dashboardAnnouncementsList");
    if (annContainer) {
        annContainer.innerHTML = hostelState.announcements.map(a => `
            <div class="retro-card p-6 bg-white flex flex-col justify-between gap-2">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-xl bg-[#DBEAFE] border-2 border-[#CBD5E1] flex items-center justify-center font-extrabold">
                            <i class="fa-solid fa-bullhorn"></i>
                        </div>
                        <div>
                            <h4 class="font-extrabold text-sm text-[#0F172A]">${a.author}</h4>
                            <span class="bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-extrabold px-2 py-0.2 rounded">${a.role}</span>
                        </div>
                    </div>
                    <span class="text-[11px] font-bold text-[#475569]"><i class="fa-regular fa-clock mr-1"></i>${a.date}</span>
                </div>
                <h5 class="font-extrabold text-sm mt-1">${a.title}</h5>
                <p class="text-xs text-[#475569] font-medium">${a.body}</p>
                <div class="text-right">
                    <button onclick="openRetroModal('${a.title.replace(/'/g, "\\'")}', 'Posted by ${a.author} (${a.date}):\\n\\n${a.body.replace(/'/g, "\\'")}')" class="text-xs font-extrabold underline hover:text-[#64748B]">
                        View Details →
                    </button>
                </div>
            </div>
        `).join("");
    }

    const recentContainer = document.getElementById("dashboardRecentActivity");
    if (recentContainer) {
        recentContainer.innerHTML = hostelState.complaints.slice(0, 2).map(c => `
            <div onclick="window.location.href='complaints.html?id=${c.id}'" class="retro-card retro-card-interactive p-6 cursor-pointer bg-white">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold uppercase text-[#475569]">Complaint #${c.id}</span>
                    <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border-2 border-[#CBD5E1] ${c.status === 'Pending' ? 'bg-[#DBEAFE]' : 'bg-[#059669] text-white'}">
                        ${c.status}
                    </span>
                </div>
                <h4 class="text-base font-extrabold mt-1">${c.subCategory}</h4>
                <p class="text-xs font-semibold text-[#475569] mt-0.5">Header: ${c.category} • Scope: <strong class="text-[#059669]">${c.scope}</strong></p>
                <div class="flex items-center justify-between text-[11px] font-bold text-[#64748B] mt-2 pt-2 border-t border-[#E2E8F0]">
                    <span>Click to view timeline / resolve</span>
                    <span><i class="fa-regular fa-calendar mr-1"></i>${c.shortDate}</span>
                </div>
            </div>
        `).join("");
    }
}

// 4. COMPLAINTS MODULE (complaints.html)
function switchComplaintSubView(subView) {
    ["list", "details", "step1", "step2"].forEach(sv => {
        const el = document.getElementById("complaint-subview-" + sv);
        if (el) el.classList.add("hidden");
    });
    const target = document.getElementById("complaint-subview-" + subView);
    if (target) target.classList.remove("hidden");
    if (subView === "list") renderComplaints("");
}

function renderComplaints(query = "") {
    const container = document.getElementById("complaintsCardsContainer");
    if (!container) return;

    const activeComplaints = hostelState.complaints.filter(c =>
        c.status === "Pending" &&
        (c.subCategory.toLowerCase().includes(query.toLowerCase()) ||
         c.category.toLowerCase().includes(query.toLowerCase()) ||
         c.description.toLowerCase().includes(query.toLowerCase()) ||
         String(c.id).includes(query))
    );

    const countLabel = document.getElementById("complaintCountLabel");
    if (countLabel) countLabel.innerText = activeComplaints.length;
    updateGlobalBadges();

    if (activeComplaints.length === 0) {
        container.innerHTML = `
            <div class="col-span-full retro-card p-10 text-center">
                <p class="text-sm font-extrabold text-[#475569]">No Complaint to display</p>
                <p class="text-xs text-[#64748B] mt-1">All your room maintenance tickets are resolved! Click "Add Complaint" to raise a new issue.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activeComplaints.map(c => `
        <div onclick="openComplaintDetailView(${c.id})" class="retro-card retro-card-interactive p-5 cursor-pointer flex flex-col justify-between gap-3">
            <div>
                <div class="flex items-center justify-between">
                    <h4 class="font-extrabold text-base">${c.subCategory} <span class="text-xs font-bold text-[#475569]">(#${c.id})</span></h4>
                    <span class="bg-[#DBEAFE] border-2 border-[#CBD5E1] text-xs font-extrabold px-3 py-0.5 rounded-lg">${c.status}</span>
                </div>
                <div class="flex gap-2 mt-2">
                    <span class="bg-[#F1F5F9] border border-[#CBD5E1] text-[11px] font-bold px-2.5 py-0.5 rounded">${c.priority}</span>
                    <span class="bg-[#EFF6FF] border border-[#CBD5E1] text-[11px] font-bold px-2.5 py-0.5 rounded">${c.category}</span>
                </div>
                <p class="text-sm font-bold mt-3">${c.description}</p>
            </div>
            <div class="flex items-center justify-between text-xs font-bold text-[#475569] pt-3 border-t-2 border-[#E2E8F0]">
                <span><i class="fa-regular fa-user mr-1"></i> ${c.assignedStaff}</span>
                <span><i class="fa-regular fa-clock mr-1"></i> ${c.createdAt}</span>
            </div>
        </div>
    `).join("");
}

function openComplaintDetailView(id) {
    if (!document.getElementById("complaintDetailsContent")) {
        window.location.href = `complaints.html?id=${id}`;
        return;
    }

    hostelState.activeComplaintId = id;
    const c = hostelState.complaints.find(item => item.id === id) || hostelState.complaints[0];
    const urlBar = document.getElementById("browserUrlText");
    if (urlBar) urlBar.innerText = `fretbox.pdeu.ac.in/hostel/complaints/${c.id}`;

    const isResolved = c.status === "Resolved";

    document.getElementById("complaintDetailsContent").innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Left: Raised By & Metadata -->
            <div class="lg:col-span-7 retro-card p-5 space-y-4">
                <div class="flex items-center justify-between border-b-2 border-[#CBD5E1] pb-3">
                    <div>
                        <span class="text-[11px] font-extrabold uppercase text-[#475569]">COMPLAINT TICKET #${c.id}</span>
                        <h3 class="text-2xl font-extrabold">${c.subCategory} (${c.category})</h3>
                    </div>
                    <span class="px-3.5 py-1 rounded-xl text-xs font-extrabold border-2 border-[#CBD5E1] ${isResolved ? 'bg-[#059669] text-white' : 'bg-[#DBEAFE]'}">
                        ${c.status}
                    </span>
                </div>

                <div class="p-3.5 bg-[#F1F5F9] rounded-xl border-2 border-[#CBD5E1] space-y-1.5 text-xs">
                    <p class="font-extrabold uppercase text-[#475569]">RAISED BY RESIDENT</p>
                    <p class="text-sm font-extrabold">Rahul Singh (Roll No: 25bcp111)</p>
                    <p class="font-semibold">Room 102, Floor - 1, HIGH RISE - B2 BLOCK</p>
                    <p class="font-semibold">Phone: 9999999999 • Email: 25bcp111@sot.pdpu.ac.in</p>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="p-3 bg-white border-2 border-[#CBD5E1] rounded-xl">
                        <span class="text-[#475569] font-bold block">Description</span>
                        <strong class="text-sm">${c.description}</strong>
                    </div>
                    <div class="p-3 bg-white border-2 border-[#CBD5E1] rounded-xl">
                        <span class="text-[#475569] font-bold block">Scope & Infra Type</span>
                        <strong class="text-sm">Residence (Room 102, B2 Block)</strong>
                    </div>
                    <div class="p-3 bg-white border-2 border-[#CBD5E1] rounded-xl">
                        <span class="text-[#475569] font-bold block">Department & Priority</span>
                        <strong class="text-sm">${c.subCategory} • ${c.priority}</strong>
                    </div>
                    <div class="p-3 bg-white border-2 border-[#CBD5E1] rounded-xl">
                        <span class="text-[#475569] font-bold block">Assigned Staff</span>
                        <strong class="text-sm">${c.assignedStaff}</strong>
                    </div>
                </div>
            </div>

            <!-- Right: Activity Timeline, Attachment & Actions -->
            <div class="lg:col-span-5 retro-card p-5 space-y-5 flex flex-col justify-between">
                <div class="space-y-4">
                    <h4 class="retro-heading text-base font-extrabold border-b-2 border-[#CBD5E1] pb-2">ACTIVITY TIMELINE</h4>
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-[#059669] text-white border-2 border-[#CBD5E1] flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                        <div class="text-xs">
                            <p class="font-extrabold">Registered</p>
                            <p class="text-[#475569] font-semibold">${c.createdAt}</p>
                            <p class="text-[#475569]">By Rahul Singh</p>
                        </div>
                    </div>
                    ${isResolved ? `
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-[#059669] text-white border-2 border-[#CBD5E1] flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                        <div class="text-xs">
                            <p class="font-extrabold">Resolved</p>
                            <p class="text-[#475569] font-semibold">${c.resolvedAt}</p>
                            <p class="text-[#475569]">By Rahul Singh</p>
                        </div>
                    </div>
                    ` : ""}

                    <div class="pt-2">
                        <p class="text-xs font-extrabold uppercase text-[#475569] mb-2">MEDIA ATTACHMENT</p>
                        <div class="w-28 h-20 rounded-xl border-2 border-[#CBD5E1] bg-[#F1F5F9] flex items-center justify-center p-2">
                            <i class="fa-solid fa-wind text-2xl mr-2"></i>
                            <span class="text-[11px] font-extrabold">Room 102 AC</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-3 pt-3 border-t-2 border-[#CBD5E1]">
                    <button onclick="showRetroToast('Clarification thread: 0 messages')" class="retro-btn-cream w-full py-2.5 text-xs font-extrabold flex items-center justify-between px-4">
                        <span>CLARIFICATION THREAD (0)</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>

                    ${!isResolved ? `
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="openResolveDialog()" class="bg-[#059669] hover:bg-emerald-800 text-white border-2 border-[#CBD5E1] rounded-xl py-3 text-xs font-extrabold flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-circle-check"></i> Mark Resolved
                        </button>
                        <button onclick="showRetroToast('Clarification note requested')" class="retro-btn-mustard py-3 text-xs font-extrabold flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-circle-question"></i> Clarification
                        </button>
                    </div>
                    ` : `<div class="p-2.5 bg-[#059669]/15 border-2 border-[#059669] rounded-xl text-center text-xs font-extrabold text-[#059669]">✓ This complaint has been marked Resolved</div>`}
                </div>
            </div>
        </div>
    `;

    switchComplaintSubView("details");
}

function openResolveDialog() {
    document.getElementById("resolveDialogModal").classList.remove("hidden");
}

function closeResolveDialog() {
    document.getElementById("resolveDialogModal").classList.add("hidden");
}

function confirmComplaintResolved() {
    closeResolveDialog();
    const target = hostelState.complaints.find(c => c.id === hostelState.activeComplaintId);
    if (target) {
        target.status = "Resolved";
        target.resolvedAt = "October 20, 2026-11:52 AM";
    }
    saveHostelState();
    updateGlobalBadges();
    openComplaintDetailView(hostelState.activeComplaintId);
    showRetroToast("success — Complaint #" + hostelState.activeComplaintId + " marked as Resolved!");
}

function selectComplaintCategory(category, iconClass) {
    hostelState.selectedCategory = category;
    document.getElementById("selectedCatName").innerText = category;
    document.getElementById("selectedCatIcon").className = "fa-solid " + iconClass;
    const subChips = hostelState.subIssuesMap[category] || ["Others"];
    hostelState.selectedSubIssue = subChips[0];
    renderSubIssueChips();
    switchComplaintSubView("step2");
}

function renderSubIssueChips() {
    const chips = hostelState.subIssuesMap[hostelState.selectedCategory] || ["Others"];
    const container = document.getElementById("subIssueChipsContainer");
    if (!container) return;
    container.innerHTML = chips.map(chip => {
        const isSelected = chip === hostelState.selectedSubIssue;
        return `
            <button type="button" onclick="hostelState.selectedSubIssue='${chip.replace(/'/g, "\\'")}'; renderSubIssueChips();" class="retro-btn-cream px-3.5 py-2 text-xs ${isSelected ? 'active-chip' : ''}">
                ${chip}
            </button>
        `;
    }).join("");
}

function submitComplaintForm() {
    const descEl = document.getElementById("complaintDescInput");
    const desc = descEl.value.trim() || `${hostelState.selectedSubIssue} issue in Room 102. Please resolve soon.`;
    const newId = Math.floor(8049 + Math.random() * 900);

    hostelState.complaints.unshift({
        id: newId,
        category: hostelState.selectedCategory,
        subCategory: hostelState.selectedSubIssue,
        priority: "Medium",
        scope: "Residence",
        description: desc,
        assignedStaff: "Not Assigned",
        status: "Pending",
        createdAt: "October 20, 2026-11:53 AM",
        shortDate: "Oct 20, 2026",
        resolvedAt: null
    });

    saveHostelState();
    descEl.value = "";
    document.getElementById("compCharCount").innerText = "0/250";
    switchComplaintSubView("list");
    showRetroToast("success — Complaint #" + newId + " submitted!");
}

// 5. LEAVES & DAYOUTS MODULE (leaves.html & dayouts.html)
function switchLeaveTab(tab) {
    hostelState.activeLeaveTab = tab;
    ["Pending", "Approved", "Expired", "Completed", "Rej/Can"].forEach(t => {
        const btn = document.getElementById("ltab-" + t);
        if (btn) {
            btn.className = (t === tab) ? "retro-btn-mustard px-4 py-2 text-xs" : "retro-btn-cream px-4 py-2 text-xs";
        }
    });
    renderLeavesList();
}

function toggleNewLeaveForm(show) {
    const form = document.getElementById("newLeaveFormWrapper");
    if (!form) return;
    if (show) {
        form.classList.remove("hidden");
        renderLeaveReasonPills();
    } else {
        form.classList.add("hidden");
    }
}

function renderLeaveReasonPills() {
    const container = document.getElementById("leaveReasonPills");
    if (!container) return;
    container.innerHTML = hostelState.leaveReasons.map(r => {
        const active = r === hostelState.selectedLeaveReason;
        return `<button type="button" onclick="hostelState.selectedLeaveReason='${r}'; renderLeaveReasonPills();" class="retro-btn-cream px-3.5 py-2 text-xs ${active ? 'active-chip' : ''}">${r}</button>`;
    }).join("");
}

function renderLeavesList() {
    const container = document.getElementById("leavesListWrapper");
    if (!container) return;
    const filtered = hostelState.leaves.filter(l => l.status === hostelState.activeLeaveTab);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="retro-card p-10 text-center">
                <p class="text-sm font-extrabold text-[#475569]">No ${hostelState.activeLeaveTab} Requests, Click "+ Apply New Leave" to add new Request</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(l => `
        <div class="retro-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-extrabold text-base">${l.reason}</span>
                    <span class="bg-[#DBEAFE] border-2 border-[#CBD5E1] text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg">${l.status}</span>
                    ${l.urgent ? `<span class="bg-[#DC2626] text-white text-[10px] font-extrabold px-2 py-0.5 rounded">URGENT</span>` : ""}
                </div>
                <p class="text-xs font-bold text-[#475569] mt-1">From: ${l.start} &nbsp;→&nbsp; To: ${l.end}</p>
                ${l.comment ? `<p class="text-xs italic mt-1">"${l.comment}"</p>` : ""}
            </div>
            <span class="text-xs font-extrabold text-[#059669]"><i class="fa-brands fa-whatsapp mr-1"></i> Parent Consent Dispatched</span>
        </div>
    `).join("");
}

function submitNewLeaveRequest() {
    const start = document.getElementById("leaveStartDt").value.replace("T", " ");
    const end = document.getElementById("leaveEndDt").value.replace("T", " ");
    const comment = document.getElementById("leaveCommentInput").value.trim();
    const urgent = document.getElementById("leaveUrgentToggle").checked;

    hostelState.leaves.unshift({
        reason: hostelState.selectedLeaveReason,
        start,
        end,
        comment,
        urgent,
        status: "Pending"
    });

    saveHostelState();
    document.getElementById("leaveCommentInput").value = "";
    toggleNewLeaveForm(false);
    switchLeaveTab("Pending");
    showRetroToast("Leave request sent for parent & warden approval!");
}

function renderDayouts() {
    const container = document.getElementById("dayoutsContainer");
    if (!container) return;
    if (hostelState.dayouts && hostelState.dayouts.length > 0) {
        const d = hostelState.dayouts[0];
        container.innerHTML = `
            <div class="flex items-center justify-between text-left">
                <div>
                    <span class="bg-[#DBEAFE] border-2 border-[#CBD5E1] text-xs font-extrabold px-2.5 py-0.5 rounded">${d.status}</span>
                    <h4 class="text-base font-extrabold mt-2">${d.title}</h4>
                    <p class="text-xs font-bold text-[#475569] mt-0.5">${d.time} • Roll No: 25bcp111</p>
                </div>
                <button onclick="showQrPassModal()" class="retro-btn-mustard px-4 py-2 text-xs">Show Gate QR</button>
            </div>
        `;
    }
}

function createQuickDayout() {
    hostelState.dayouts = [{
        status: "Pending Gate Pass",
        title: "Day Out — Gandhinagar City Visit",
        time: "Today 04:30 PM → 09:30 PM"
    }];
    saveHostelState();
    renderDayouts();
    showRetroToast("Day-Out pass created!");
}

// 6. CONTACTS DIRECTORY (contacts.html)
function renderContactsGrid(filter = "") {
    const container = document.getElementById("contactsGridContainer");
    if (!container) return;
    const filtered = hostelState.contacts.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.designation.toLowerCase().includes(filter.toLowerCase()) ||
        c.phone.includes(filter)
    );

    container.innerHTML = filtered.map(c => `
        <div class="retro-card p-5 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-xl bg-[#DBEAFE] border-2 border-[#CBD5E1] flex items-center justify-center text-lg shrink-0">
                    <i class="fa-solid fa-user-tie"></i>
                </div>
                <div class="min-w-0">
                    <h4 class="font-extrabold text-xs sm:text-sm truncate">${c.name}</h4>
                    <p class="text-xs font-bold text-[#475569]">${c.phone}</p>
                    <span class="inline-block mt-1 bg-[#EFF6FF] border border-[#CBD5E1] text-[10px] font-extrabold px-2 py-0.5 rounded truncate max-w-full">
                        Designation: ${c.designation}
                    </span>
                </div>
            </div>
            <button onclick="triggerCallToast('${c.name.replace(/'/g, "\\'")}', '${c.phone}')" class="w-10 h-10 rounded-full bg-[#059669] text-white border-2 border-[#CBD5E1] flex items-center justify-center shrink-0 hover:scale-105 transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
        </div>
    `).join("");
}

// 7. PROFILE SUB-SECTIONS (profile.html)
function switchProfileSection(sec) {
    if (!document.getElementById("prof-content-personal")) {
        window.location.href = `profile.html?tab=${sec}`;
        return;
    }
    ["personal", "academic", "myroom", "kyc", "inventory"].forEach(s => {
        const contentEl = document.getElementById("prof-content-" + s);
        const tabEl = document.getElementById("prof-tab-" + s);
        if (contentEl) contentEl.classList.add("hidden");
        if (tabEl) {
            tabEl.className = (s === sec)
                ? "retro-btn-mustard px-4 py-2 text-xs"
                : "retro-btn-cream px-4 py-2 text-xs";
        }
    });
    const activeEl = document.getElementById("prof-content-" + sec);
    if (activeEl) activeEl.classList.remove("hidden");
}

// 8. GLOBAL SEARCH & MODALS
function focusGlobalSearch() {
    const input = document.getElementById("globalSearchInput");
    if (input) input.focus();
}

function handleGlobalSearch(q) {
    const dropdown = document.getElementById("globalSearchDropdown");
    if (!dropdown) return;
    if (!q.trim()) {
        dropdown.classList.add("hidden");
        return;
    }
    const quickMatches = [
        { name: "Complaint #8048 (AC Cooling)", view: "complaints" },
        { name: "Add New Electricity / Room Complaint", view: "complaints" },
        { name: "Apply for Hostel Leave", view: "leaves" },
        { name: "Raise Day-Out Pass", view: "dayouts" },
        { name: "Room 102 & Roommates (Varin, Vandan)", view: "profile" },
        { name: "Warden & Ambulance Contacts", view: "contacts" }
    ].filter(item => item.name.toLowerCase().includes(q.toLowerCase()));

    dropdown.classList.remove("hidden");
    dropdown.innerHTML = quickMatches.length
        ? quickMatches.map(m => `<button onclick="navigateView('${m.view}');" class="retro-btn-mustard px-3 py-1 text-xs">${m.name} →</button>`).join("")
        : `<span class="text-xs font-bold text-[#475569]">No matching module found.</span>`;
}

function openRetroModal(title, body) {
    document.getElementById("retroModalTitle").innerText = title;
    document.getElementById("retroModalBody").innerText = body;
    document.getElementById("retroInfoModal").classList.remove("hidden");
}

function closeRetroModal() {
    document.getElementById("retroInfoModal").classList.add("hidden");
}

function showQrPassModal() {
    openRetroModal(
        "DIGITAL GATE PASS QR — 25bcp111",
        "Student: Rahul Singh\nRoll No: 25bcp111 | FretBox ID: 2541\nRoom: 102 - HIGH RISE - B2 BLOCK (3S AC A)\nStatus: AUTHORIZED RESIDENT"
    );
}

function triggerCallToast(name, phone) {
    showRetroToast(`Dialing ${name} (${phone})...`);
}

let retroToastTimeout = null;
function showRetroToast(msg) {
    const t = document.getElementById("retroToast");
    if (!t) return;
    document.getElementById("retroToastText").innerText = msg;
    t.classList.remove("hidden");
    clearTimeout(retroToastTimeout);
    retroToastTimeout = setTimeout(() => t.classList.add("hidden"), 2600);
}

function toggleFullWidth() {
    const win = document.querySelector(".browser-window");
    if (win) {
        win.classList.toggle("max-w-[98vw]");
        win.classList.toggle("xl:max-w-[1840px]");
        win.classList.toggle("max-w-full");
    }
}

// 9. INITIALIZE CURRENT PAGE ON LOAD
window.addEventListener("DOMContentLoaded", function () {
    updateGlobalBadges();
    const currentPage = document.body.getAttribute("data-page");
    const params = new URLSearchParams(window.location.search);

    if (currentPage === "dashboard") {
        renderDashboard();
    } else if (currentPage === "complaints") {
        renderComplaints("");
        const cid = params.get("id");
        if (cid) {
            openComplaintDetailView(Number(cid));
        }
    } else if (currentPage === "leaves") {
        renderLeavesList();
        renderLeaveReasonPills();
    } else if (currentPage === "dayouts") {
        renderDayouts();
    } else if (currentPage === "contacts") {
        renderContactsGrid("");
    } else if (currentPage === "profile") {
        const tab = params.get("tab");
        if (tab) {
            switchProfileSection(tab);
        }
    }
});

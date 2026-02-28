let events = [];
let showOld = false;

const tableBody = document.querySelector("#eventsTable tbody");
const searchInput = document.getElementById("searchInput");
const toggleOldBtn = document.getElementById("toggleOldBtn");
const adminMessage = document.getElementById("adminMessage");

// Modal elements
const modal = document.getElementById("editModal");
const modalEventId = document.getElementById("modalEventId");
const modalTitleInput = document.getElementById("modalTitle");
const modalDate = document.getElementById("modalDate");
const modalStartTime = document.getElementById("modalStartTime");
const modalEndTime = document.getElementById("modalEndTime");
const modalType = document.getElementById("modalType");
const modalGroupSize = document.getElementById("modalGroupSize");
const modalContactName = document.getElementById("modalContactName");
const modalContactInfo = document.getElementById("modalContactInfo");
const modalDescription = document.getElementById("modalDescription");
const modalRecurring = document.getElementById("modalRecurring");
const modalRecurWhen = document.getElementById("modalRecurWhen");
const modalRecurLengthNum = document.getElementById("modalRecurLengthNum");
const recurringEditSection = document.getElementById("recurringEditSection");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

/* =========================
   LOAD EVENTS
========================= */
async function loadEvents() {
  try {
    const params = new URLSearchParams({ admin: "true" });
    if (!showOld) params.set("cutoff", new Date().toISOString());

    const res = await fetch(`/api/event?${params.toString()}`);
    events = await res.json();

    renderTable(events);
  } catch (err) {
    console.error("Failed to load events:", err);
    showAdminMessage("Failed to load events.", "error");
  }
}

/* =========================
   RENDER TABLE
========================= */
function renderTable(data) {
  tableBody.innerHTML = "";

  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center">No events found</td></tr>`;
    return;
  }

  data.forEach(event => {
    const time =
      event.startTime && event.endTime
        ? `${event.startTime} – ${event.endTime}`
        : event.startTime || "";

    const contact = event.contactName
      ? `${event.contactName}<br><small>${event.contactInfo || ""}</small>`
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${event.date || ""}</td>
      <td>${time}</td>
      <td>${event.title || ""}</td>
      <td>${event.eType || ""}</td>
      <td>${event.groupSize || ""}</td>
      <td>${contact}</td>
      <td></td>
      <td>
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      </td>
    `;

    tr.querySelector(".editBtn").onclick = () => openModal(event, false);
    tr.querySelector(".deleteBtn").onclick = () => deleteEvent(event._id);

    // ONLY show payment buttons for true paid events
    // Strict match to prevent buttons showing on wrong event types
    const isPaidEvent = event.eType === "reservedPaid";

    if (isPaidEvent) {
      const depositBtn = document.createElement("button");
      depositBtn.textContent = "Deposit";
      depositBtn.className = `depositBtn ${event.depositPaid ? "paid" : ""}`;
      depositBtn.onclick = () => togglePayment(event._id, "depositPaid");

      const feeBtn = document.createElement("button");
      feeBtn.textContent = "Fee";
      feeBtn.className = `feeBtn ${event.feePaid ? "paid" : ""}`;
      feeBtn.onclick = () => togglePayment(event._id, "feePaid");

      tr.children[6].appendChild(depositBtn);
      tr.children[6].appendChild(feeBtn);
    }

    tableBody.appendChild(tr);
  });
}

/* =========================
   EDIT MODAL
========================= */
function openModal(event, singleEdit = false) {
  modalEventId.value = event._id || "";

  modalTitleInput.value = event.title || "";
  modalDate.value = event.date || "";
  modalStartTime.value = event.startTime || "";
  modalEndTime.value = event.endTime || "";
  modalType.value = event.eType || "";
  modalGroupSize.value = event.groupSize || "";
  modalContactName.value = event.contactName || "";
  modalContactInfo.value = event.contactInfo || "";
  modalDescription.value = event.description || "";

  modalRecurring.checked = !!event.recurring;

  if (event.recurring && event.isParent && !singleEdit) {
    recurringEditSection.classList.remove("hidden");
    modalRecurWhen.value = event.recurWhen || "week";
    modalRecurLengthNum.value = event.recurLengthNum || "";
  } else {
    recurringEditSection.classList.add("hidden");
  }

  modal.dataset.singleEdit = singleEdit ? "true" : "false";
  modal.classList.remove("hidden");
}

/* =========================
   SAVE EVENT
========================= */
modalSaveBtn.onclick = async () => {
  const id = modalEventId.value;
  const singleEdit = modal.dataset.singleEdit === "true";

  const payload = {
    id,
    singleEdit,
    title: modalTitleInput.value,
    date: modalDate.value,
    startTime: modalStartTime.value,
    endTime: modalEndTime.value,
    eType: modalType.value,
    groupSize: modalGroupSize.value,
    contactName: modalContactName.value,
    contactInfo: modalContactInfo.value,
    description: modalDescription.value,
    recurWhen: modalRecurWhen.value,
    recurLengthNum: modalRecurLengthNum.value
  };

  try {
    const res = await fetch("/api/event", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success)
      showAdminMessage("Event saved successfully!", "success");
    else
      showAdminMessage(data.error || "Failed to save event.", "error");
  } catch (err) {
    console.error("Failed to save event:", err);
    showAdminMessage("Server error: Could not save event.", "error");
  }

  modal.classList.add("hidden");
  loadEvents();
};

/* =========================
   PAYMENT TOGGLE
========================= */
window.togglePayment = async (id, field) => {
  try {
    const res = await fetch("/api/event", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, field })
    });

    const data = await res.json();

    if (res.ok && data.success)
      showAdminMessage("Payment status updated!", "success");
    else
      showAdminMessage(data.error || "Failed to update payment.", "error");

    loadEvents();
  } catch (err) {
    console.error("Payment toggle error:", err);
    showAdminMessage("Server error: Could not toggle payment.", "error");
  }
};

/* =========================
   DELETE EVENT
========================= */
window.deleteEvent = async id => {
  if (!confirm("Delete this event?")) return;

  try {
    const res = await fetch("/api/event", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    const data = await res.json();

    if (res.ok && data.success)
      showAdminMessage("Event deleted successfully!", "success");
    else
      showAdminMessage(data.error || "Failed to delete event.", "error");

    loadEvents();
  } catch (err) {
    console.error("Delete event error:", err);
    showAdminMessage("Server error: Could not delete event.", "error");
  }
};

/* =========================
   SEARCH EVENTS
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();

  const filtered = events.filter(e =>
    (e.title && e.title.toLowerCase().includes(q)) ||
    (e.contactName && e.contactName.toLowerCase().includes(q)) ||
    (e.contactInfo && e.contactInfo.toLowerCase().includes(q)) ||
    (e.date && e.date.includes(q)) ||
    (e.eType && e.eType.toLowerCase().includes(q))
  );

  renderTable(filtered);
});

/* =========================
   SHOW/OMIT OLDER EVENTS
========================= */
toggleOldBtn.onclick = () => {
  showOld = !showOld;
  toggleOldBtn.textContent = showOld
    ? "Hide Older Events"
    : "Show Older Events";
  loadEvents();
};

/* =========================
   MODAL CANCEL
========================= */
modalCancelBtn.onclick = () => modal.classList.add("hidden");

/* =========================
   ADD NEW EVENT
========================= */
const addEventBtn = document.getElementById("addEventBtn");
addEventBtn.onclick = () => {
  modalEventId.value = "";
  modalTitleInput.value = "";
  modalDate.value = "";
  modalStartTime.value = "";
  modalEndTime.value = "";
  modalType.value = "";
  modalGroupSize.value = "";
  modalContactName.value = "";
  modalContactInfo.value = "";
  modalDescription.value = "";
  modalRecurring.checked = false;
  modalRecurWhen.value = "week";
  modalRecurLengthNum.value = "";
  recurringEditSection.classList.add("hidden");

  modal.dataset.singleEdit = "false";
  modal.classList.remove("hidden");
};

/* =========================
   SHOW ADMIN MESSAGE
========================= */
function showAdminMessage(msg, type = "success") {
  adminMessage.textContent = msg;
  adminMessage.className = `admin-message ${type}`;
  adminMessage.classList.remove("hidden");
  setTimeout(() => adminMessage.classList.add("hidden"), 4000);
}

/* =========================
   INITIAL LOAD
========================= */
loadEvents();
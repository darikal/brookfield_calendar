import {
  EVENT_TYPE_CLASSES,
  formatTime12h,
  isAM,
  normalizeType
} from "./common.js";

let currentDate = new Date();
let events = [];
let lastClickedDay = null;

const reminderList = document.getElementById("reminderList");
const calendarBody = document.getElementById("calendar-body");
const monthAndYear = document.getElementById("monthAndYear");

const prevBtn = document.getElementById("previous");
const nextBtn = document.getElementById("next");

/* =========================
   LOAD EVENTS
========================= */
async function loadEvents() {
  try {
    const res = await fetch("/api/getEventsFront");
    events = await res.json();
    renderCalendar();
    renderEventList();
  } catch (err) {
    console.error("Failed to load events:", err);
  }
}

/* =========================
   CALENDAR
========================= */
function renderCalendar() {
  calendarBody.innerHTML = "";

  monthAndYear.textContent =
    currentDate.toLocaleString("default", { month: "long" }) +
    " " +
    currentDate.getFullYear();

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  let date = 1;

  for (let i = 0; i < 6; i++) {
    const row = document.createElement("tr");

    for (let j = 0; j < 7; j++) {
      const cell = document.createElement("td");

      if ((i === 0 && j < firstDay) || date > daysInMonth) {
        cell.innerHTML = "";
      } else {
        const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
        cell.textContent = date;

        const dayEvents = events.filter(e => e.date === dStr);

        if (dayEvents.length) {
          cell.classList.add("has-events");

          const am = document.createElement("div");
          const pm = document.createElement("div");
          am.className = "event-dots-am";
          pm.className = "event-dots-pm";

          dayEvents.forEach(e => {
            const normalized = normalizeType(e.eType);
            const dot = document.createElement("span");
            dot.className = "event-dot " + (EVENT_TYPE_CLASSES[normalized] || "event-default");
            (isAM(e.startTime) ? am : pm).appendChild(dot);
          });

          if (am.children.length) cell.appendChild(am);
          if (pm.children.length) cell.appendChild(pm);

          cell.addEventListener("click", e => {
            e.stopPropagation();

            if (lastClickedDay === dStr) {
              renderEventList();
              lastClickedDay = null;
            } else {
              renderEventList(dStr, true);
              lastClickedDay = dStr;

              const firstEvent = document.querySelector(`[data-key='${dStr}']`);
              firstEvent?.scrollIntoView({ behavior: "smooth" });
            }
          });
        }

        date++;
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
    if (date > daysInMonth) break;
  }
}

/* =========================
   EVENT LIST
========================= */
function renderEventList(dayFilter = null, openAll = false) {
  reminderList.innerHTML = "";

  const monthEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const listToRender = dayFilter ? monthEvents.filter(e => e.date === dayFilter) : monthEvents;

  listToRender.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime || "00:00"}`);
    const dateB = new Date(`${b.date}T${b.startTime || "00:00"}`);
    return dateA - dateB;
  });

  listToRender.forEach(e => {
    const normalized = normalizeType(e.eType);

    const li = document.createElement("li");
    li.className = "reminder-item";
    li.dataset.key = e.date;

    li.innerHTML = `
      <div class="reminder-header ${EVENT_TYPE_CLASSES[normalized] || ""}">
        ${e.title} – ${e.date}
      </div>
      <div class="reminder-details ${openAll ? "show" : ""}">
        ${formatTime12h(e.startTime)}
        ${e.endTime ? " – " + formatTime12h(e.endTime) : ""}
        <br>${e.description || ""}
      </div>
    `;

    li.querySelector(".reminder-header").onclick = () => {
      li.querySelector(".reminder-details").classList.toggle("show");
    };

    reminderList.appendChild(li);
  });
}

/* =========================
   MONTH NAVIGATION
========================= */
prevBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
  renderEventList();
};

nextBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
  renderEventList();
};

/* =========================
   OUTSIDE CLICK RESET
========================= */
document.addEventListener("click", (e) => {
  const clickedInsideCalendar = e.target.closest("#calendar-body");
  const clickedInsideEvents = e.target.closest("#reminderList");

  if (!clickedInsideCalendar && !clickedInsideEvents) {
    if (lastClickedDay !== null) {
      renderEventList();
      lastClickedDay = null;
    }
  }
});

/* =========================
   INITIAL LOAD
========================= */
loadEvents();

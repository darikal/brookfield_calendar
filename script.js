let currentDate = new Date();
let events = [];

/* ---------------- Helpers ---------------- */
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2,"0")} ${period}`;
}
function isAM(time) { return !time || Number(time.split(":")[0]) < 12; }

/* ---------------- Load Events ---------------- */
async function loadEvents() {
  try {
    const res = await fetch("/api/getEvents");
    events = await res.json();
    renderCalendar();
    renderEventList();
  } catch(e) { console.error("Failed to load events:", e); }
}

/* ---------------- Render Event List ---------------- */
function renderEventList() {
  const ul = document.getElementById("reminderList");
  ul.innerHTML = "";

  events.sort((a,b)=> new Date(a.date)-new Date(b.date))
    .forEach(ev => {
      const li = document.createElement("li");
      li.className = "reminder-item";
      li.dataset.date = ev.date;

      const cls = ev.eventTypeMajor || "default";

      li.innerHTML = `
        <div class="reminder-header event-${cls}">
          ${ev.eventTitle || ev.title || "No Title"}
        </div>
        <div class="reminder-details">
          <small>${ev.date} • ${ev.startTime||""}–${ev.endTime||""}</small><br>
          ${ev.eventDescription||""}
        </div>
      `;

      li.querySelector(".reminder-header").onclick = () => {
        li.querySelector(".reminder-details").classList.toggle("show");
      };

      ul.appendChild(li);
    });
}

/* ---------------- Render Calendar ---------------- */
function renderCalendar() {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  document.getElementById("monthAndYear").textContent =
    currentDate.toLocaleString("default",{month:"long"})+" "+year;

  const body = document.getElementById("calendar-body");
  body.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let date = 1;

  for (let i=0;i<6;i++) {
    const row = document.createElement("tr");

    for (let j=0;j<7;j++) {
      const cell = document.createElement("td");

      if(i===0 && j<firstDay || date>daysInMonth){
        cell.innerHTML = "";
      } else {
        const dStr = `${year}-${String(month+1).padStart(2,"0")}-${String(date).padStart(2,"0")}`;
        cell.dataset.date = dStr;
        cell.textContent = date;

        const dayEvents = events.filter(e => e.date === dStr);
        if(dayEvents.length){
          cell.classList.add("has-events");

          const amDiv = document.createElement("div");
          amDiv.className = "event-dots-am";
          const pmDiv = document.createElement("div");
          pmDiv.className = "event-dots-pm";

          dayEvents.forEach(e=>{
            const dot = document.createElement("span");
            const cls = e.eventTypeMajor || "default";
            dot.className = "event-dot event-"+cls;

            dot.onclick = ev=>{
              ev.stopPropagation();
              const li = document.querySelector(`[data-date='${e.date}']`);
              if(li){
                li.scrollIntoView({behavior:"smooth"});
                li.classList.add("highlight");
                setTimeout(()=>li.classList.remove("highlight"),2000);
              }
            };

            (isAM(e.startTime)?amDiv:pmDiv).appendChild(dot);
          });

          if(amDiv.children.length) cell.appendChild(amDiv);
          if(pmDiv.children.length) cell.appendChild(pmDiv);
        }

        // Click anywhere on cell
        cell.onclick = () => openEventsForDate(dStr);

        date++;
      }

      row.appendChild(cell);
    }
    body.appendChild(row);
    if(date>daysInMonth) break;
  }
}

/* ---------------- Open/Close Events ---------------- */
function openEventsForDate(dateStr){
  const section = document.getElementById("reminder-section");
  let anyOpen = false;

  document.querySelectorAll(".reminder-item").forEach(item=>{
    const details = item.querySelector(".reminder-details");
    if(item.dataset.date===dateStr){
      details.classList.toggle("show");
      item.classList.toggle("highlight");
      item.classList.remove("dimmed");
      anyOpen = true;
    } else {
      details.classList.remove("show");
      item.classList.remove("highlight");
      item.classList.add("dimmed");
    }
  });

  if(anyOpen) section.scrollIntoView({behavior:"smooth"});
}

/* ---------------- Navigation ---------------- */
document.getElementById("previous").onclick = ()=>{
  currentDate.setMonth(currentDate.getMonth()-1);
  renderCalendar(); renderEventList();
};
document.getElementById("next").onclick = ()=>{
  currentDate.setMonth(currentDate.getMonth()+1);
  renderCalendar(); renderEventList();
};

const monthSel = document.getElementById("month");
const yearSel = document.getElementById("year");
for(let m=0;m<12;m++)
  monthSel.innerHTML += `<option value="${m}">${new Date(0,m).toLocaleString("default",{month:"long"})}</option>`;
for(let y=currentDate.getFullYear()-5;y<=currentDate.getFullYear()+5;y++)
  yearSel.innerHTML += `<option value="${y}">${y}</option>`;
monthSel.value = currentDate.getMonth();
yearSel.value = currentDate.getFullYear();
monthSel.onchange = ()=>{ currentDate.setMonth(+monthSel.value); renderCalendar(); renderEventList(); };
yearSel.onchange = ()=>{ currentDate.setFullYear(+yearSel.value); renderCalendar(); renderEventList(); };

/* ---------------- Init ---------------- */
loadEvents();

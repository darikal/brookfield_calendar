let events = [];

const eventDateInput = document.getElementById("eventDate");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const walkInSelect = document.getElementById("walkInWelcome");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const reminderList = document.getElementById("reminderList");

let eventIdCounter = 1;

function parseDateFromInput(value) {
    const [y,m,d] = value.split("-").map(Number);
    return new Date(y,m-1,d);
}

function getReadableEventType(eType) {
    switch(eType) {
        case "socialCommitteeEvent": return "Social Committee";
        case "smallGroup": return "Small Group";
        case "reservedPaid": return "Paid Reservation";
        case "noSocialnoPaid": return "Large Group";
        default: return "Event";
    }
}

function addEvent() {
    const dropdown = document.getElementById("eventTypeMajor");
    const date = eventDateInput.value;
    const title = eventTitleInput.value;
    const description = eventDescriptionInput.value;
    const eType = dropdown.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if(eType === "reservedPaid" && !document.getElementById('acceptTerms').checked) {
        alert("Accept terms for paid reservations.");
        return;
    }

    if(date && title) {
        let eventId = eventIdCounter++;
        events.push({id:eventId, date, title, description, eType, startTime, endTime});
        showCalendar(currentMonth, currentYear);
        eventDateInput.value=""; eventTitleInput.value=""; eventDescriptionInput.value="";
        startTimeInput.value=""; endTimeInput.value="";
        walkInSelect.value="";
        toggleDiv();
        toggleTitleDiv();
        displayReminders();
    }
}

function deleteEvent(eventId) {
    const idx = events.findIndex(e => e.id===eventId);
    if(idx!==-1) { events.splice(idx,1); showCalendar(currentMonth,currentYear); displayReminders(); }
}

function toggleRecurDiv() {
    const recurDiv = document.getElementById('recurring');
    const recurBox = document.getElementById('recurCheckbox');
    recurDiv.style.display = recurBox.checked ? 'block' : 'none';
}

function toggleTitleDiv() {
    const dropdown = document.getElementById('eventTypeMajor');
    const recurBox = document.getElementById('recurCheckbox');
    const recurDiv = document.getElementById('recurring');

    if(!dropdown.value) { document.getElementById('eventDetailsWrapper').style.display='none'; return; }
    document.getElementById('eventDetailsWrapper').style.display='block';

    if(dropdown.value === "reservedPaid") {
        document.getElementById('titleDiv').style.display='none';
        document.getElementById('paidInfo').style.display='block';
        document.getElementById('contactDiv').style.display='none';
        document.getElementById('recurBox').style.display='none';
        recurBox.checked=false; recurDiv.style.display='none';
    } else {
        document.getElementById('titleDiv').style.display='block';
        document.getElementById('paidInfo').style.display='none';
        document.getElementById('contactDiv').style.display='block';
        document.getElementById('recurBox').style.display='block';
        recurDiv.style.display='none';
    }
}

function toggleDiv() {
    const otherDiv = document.getElementById("eventOther");
    const signUpDiv = document.getElementById("signUpField");
    if(walkInSelect.value==="Other"){ otherDiv.style.display="block"; signUpDiv.style.display="none"; }
    else if(walkInSelect.value==="signUpRequired"){ signUpDiv.style.display="block"; otherDiv.style.display="none"; }
    else{ otherDiv.style.display="none"; signUpDiv.style.display="none"; }
}

function displayReminders() {
    reminderList.innerHTML="";
    for(let ev of events){
        let eventDate = parseDateFromInput(ev.date);
        if(eventDate.getMonth()===currentMonth && eventDate.getFullYear()===currentYear){
            let timeText = (ev.startTime||ev.endTime) ? ` (${ev.startTime||'??:??'}-${ev.endTime||'??:??'})` : '';
            let li=document.createElement("li");
            li.innerHTML=`<strong>${getReadableEventType(ev.eType)}</strong>${timeText}: ${ev.description}`;
            let btn=document.createElement("button");
            btn.className="delete-event"; btn.textContent="Delete";
            btn.onclick=()=>deleteEvent(ev.id);
            li.appendChild(btn);
            reminderList.appendChild(li);
        }
    }
}

// ----------------- Calendar Boilerplate -----------------
function getEventsOnDate(date,month,year){return events.filter(e=>{const d=parseDateFromInput(e.date); return d.getDate()===date && d.getMonth()===month && d.getFullYear()===year;});}
function daysInMonth(iMonth,iYear){return 32-new Date(iYear,iMonth,32).getDate();}
function getEventColorClass(eType){switch(eType){case "socialCommitteeEvent":return "event-social"; case "smallGroup":return "event-small"; case "reservedPaid":return "event-paid"; case "noSocialnoPaid":return "event-large"; default:return "event-default";}}
function generate_year_range(start,end){let y="";for(let i=start;i<=end;i++){y+=`<option value='${i}'>${i}</option>`;}return y;}

let today=new Date(), currentMonth=today.getMonth(), currentYear=today.getFullYear();
const selectYear=document.getElementById("year"), selectMonth=document.getElementById("month"), monthAndYear=document.getElementById("monthAndYear");
document.getElementById("year").innerHTML = generate_year_range(2020,2075);

function showCalendar(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const tbl = document.getElementById("calendar-body");
    tbl.innerHTML = "";
    monthAndYear.innerHTML = [
        "January","February","March","April","May","June","July","August","September","October","November","December"
    ][month] + " " + year;
    selectYear.value = year;
    selectMonth.value = month;
    
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement("tr");
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement("td");
            if (i === 0 && j < firstDay) { 
                row.appendChild(cell); 
                continue; 
            }
            if (date > daysInMonth(month, year)) break;

            cell.className = "date-picker";
            cell.innerHTML = `<span>${date}</span>`;

            // Highlight today's date
            if (date === today.getDate() && year === today.getFullYear() && month === today.getMonth()) {
                cell.classList.add("selected");
            }

            // Add event markers
            const eventsOnDate = getEventsOnDate(date, month, year);
            if (eventsOnDate.length) {
                cell.classList.add("event-marker");
                const dots = document.createElement("div");
                dots.className = "event-dots";
                eventsOnDate.forEach(ev => {
                    const dot = document.createElement("span");
                    dot.className = "event-dot " + getEventColorClass(ev.eType);
                    dot.title = getReadableEventType(ev.eType);
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);

                // Tooltip creation
                const tooltip = document.createElement("div");
                tooltip.className = "event-tooltip";
                tooltip.innerHTML = eventsOnDate.map(ev => 
                    `<strong>${getReadableEventType(ev.eType)}</strong><br>${ev.title || ev.description}<br>${ev.startTime || ''}-${ev.endTime || ''}`
                ).join("<hr style='margin:3px 0;'>");
                cell.appendChild(tooltip);
            }

            // Click on date to fill event input
            ((d) => {
                cell.onclick = () => {
                    eventDateInput.value = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    document.querySelectorAll(".date-picker").forEach(td => td.classList.remove("selected"));
                    cell.classList.add("selected");
                    if (!document.getElementById('eventTypeMajor').value) document.getElementById('eventTypeMajor').value = "reservedPaid";
                    toggleTitleDiv();
                };
            })(date);

            row.appendChild(cell);
            date++;
        }
        tbl.appendChild(row);
    }
    displayReminders();
}

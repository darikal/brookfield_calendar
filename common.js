/* =========================================
   TYPE NORMALIZATION LAYER
   Handles old DB values automatically
========================================= */

export function normalizeType(raw) {
  if (!raw) return "socialEvent";

  const value = raw.toLowerCase();

  if (value.includes("small")) return "smallGroup";
  if (value.includes("large")) return "largeGroup";
  if (value.includes("board")) return "boardMeeting";
  if (value.includes("paid")) return "paidEvent";
  if (value.includes("social")) return "socialEvent";

  return "socialEvent";
}

/* =========================================
   CSS CLASS MAP (CANONICAL ONLY)
========================================= */

export const EVENT_TYPE_CLASSES = {
  socialEvent: "event-socialEvent",
  smallGroup: "event-smallGroup",
  largeGroup: "event-largeGroup",
  boardMeeting: "event-boardMeeting",
  paidEvent: "event-paidEvent"
};

export const TYPE_LABELS = {
  socialEvent: "Social Event",
  smallGroup: "Small Group",
  largeGroup: "Large Group",
  boardMeeting: "Board Meeting",
  paidEvent: "Paid Event"
};

export function formatTime12h(time) {
  if (!time) return "";
  let [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function isAM(time) {
  if (!time) return true;
  return parseInt(time.split(":")[0], 10) < 12;
}

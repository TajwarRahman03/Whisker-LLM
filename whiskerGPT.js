let savedChats = [];
let currentChatId = null;
let isSavedChatsVisible = false;

let activePopup = null;

let pendingImageDataUrl = null;
let pendingImageName = null;
let pendingImageLoading = false;

let isReadOnlyMode = false;

let isAnnouncementsVisible = false;
let isHuddlesVisible = false;
let isNewslettersVisible = false;

let welcomeDismissed = false;

let themeMode = "light";
let isSettingsMenuOpen = false;

/* Strong send lock to prevent double-send placeholder issues */
let sendLock = false;

const SEEN_BADGES_KEY = "whiskerSeenBadges";

/* ===============================
   Static data
=============================== */
const ANNOUNCEMENTS = {
  "2/3/26": [
    [
      "Whisker app v1.34 deployment",
      "Whisker app v1.34 deployment has started. Customer apps will automatically update within the next seven days.😺",
      "",
      "There are a lot of new features, and bug fixes going out, but here are some of the big items that you need to know about:",
      "",
      "Whisker+ video storage feature: Whisker+ customers will be able to view captured videos from their LR5 Pro as far back as 30 days. LR5 Pro customers on the free Whisker app, will have access to two days of videos. Please note, free Whisker app users were previously able to view up to seven days of video history, this was not by design, but the result of a bug that was fixed with this release. Additional information is available at Key Feature Breakdown & FAQ for CX.",
      "",
      "App Performance: Multiple bug fixes and updates made to improve overall app performance and speed.",
      "",
      "Local times: Instead of the previous default UTC time for graphs, recaps and insights, customers will now see their pet usage information recorded in their local time zone."
    ],
    {
      author: "Sharon Silva",
      time: "9:52 AM",
      title: "Friendly Reminder: Training on Performance Reviews",
      lines: [
        "In regards to the calendar invitation for the optional training on performance reviews scheduled for today, February 3rd at 3:00 PM EST, we ask that you ignore this calendar invite given the priorities and focus of your role.",
        "",
        "The content is a refresher and closely aligns with the performance review overview previously shared during the October Town Hall. However, this short, optional training will be recorded and shared afterward, should you find it helpful to review at your convenience.",
        "",
        "Thank you, team!"
      ]
    },
    {
      author: "Ryan Lewis",
      time: "3:30 PM",
      title: "Hard Power Cycle Process Update",
      lines: [
        "We recently received new guidance on how best to complete a hard power cycle on the LR4, LR5 and LR5 Pro, that should save you and your customers some time. Our original process was to unplug the robots for a minute, and then wait up to 90 seconds after plugging it back in to complete a hard power cycle. The updated process is as follows:",
        "",
        "Litter Robot 4- While powered on: unplug the robot, wait 15 seconds, plug the robot back in.",
        "Litter Robot 5 / 5 Pro- While powered on: unplug the robot, wait 15 seconds, plug the robot back in, wait 60 seconds.",
        "",
        "In some cases, hard power cycles are required to resolve WiFi chip faults, camera initialization failures and interrupted OTA’s. Internal and external processes have been updated where this step is required."
      ]
    }
  ],
  "1/1/26": [
    "📌 Update — 1/1/26",
    "This is a placeholder announcement page.",
    "Add your real update text here later."
  ],
  "1/15/26": [
    "🎄 Update — 1/15/26",
    "Holiday update placeholder.",
    "More details can go here in separate bubbles."
  ],
  "1/29/26": [
    "🚀 NEW — 1/29/26",
    "Welcome to WhiskerGPT Announcements + Updates!",
    "This section is read-only and is not saved as a chat."
  ]
};

const HUDDLES = {
  "1/1/26": {
    author: "Whisker Team",
    time: "—",
    title: "🎥 Weekly Huddle — 1/1/26",
    bodyLines: [
      "Placeholder notes for this weekly huddle.",
      "Add your key talking points here.",
      "Date: 1/1/26"
    ],
    videoSrc: "huddle_videos/video_placeholder.mp4"
  },
  "1/15/26": {
    author: "Whisker Team",
    time: "—",
    title: "🎥 Weekly Huddle — 1/15/26",
    bodyLines: [
      "Holiday week huddle placeholder.",
      "Add any updates and action items here.",
      "Date: 1/15/26"
    ],
    videoSrc: "huddle_videos/video_placeholder.mp4"
  },
  "1/29/26": {
    author: "Whisker Team",
    time: "—",
    title: "🎥 Weekly Huddle — 1/29/26",
    bodyLines: [
      "New Year huddle placeholder.",
      "Add the agenda, outcomes, and next steps here.",
      "Date: 1/29/26"
    ],
    videoSrc: "huddle_videos/video_placeholder.mp4"
  }
};

const NEWSLETTERS = [
  {
    author: "Whisker Team",
    time: "—",
    date: "1/1/26",
    title: "📰 Weekly Newsletter — 1/1/26",
    bodyLines: [
      "Placeholder newsletter update.",
      "Add your real weekly highlights here.",
      "Date: 1/1/26"
    ]
  },
  {
    author: "Whisker Team",
    time: "—",
    date: "1/15/26",
    title: "📰 Weekly Newsletter — 1/15/26",
    bodyLines: [
      "Holiday week newsletter placeholder.",
      "Add your weekly recap content here.",
      "Date: 1/15/26"
    ]
  },
  {
    author: "Whisker Team",
    time: "—",
    date: "1/29/26",
    title: "📰 Weekly Newsletter — 1/29/26",
    bodyLines: [
      "New Year newsletter placeholder.",
      "Add updates, wins, and upcoming focus areas.",
      "Date: 1/29/26"
    ]
  }
];

/* ===============================
   Helpers
=============================== */
function parseMMDDYY(dateStr) {
  const [m, d, yy] = dateStr.split("/").map((n) => parseInt(n, 10));
  return new Date(2000 + yy, m - 1, d);
}

function sortDatesNewestFirst(arr) {
  return arr.slice().sort((a, b) => parseMMDDYY(b) - parseMMDDYY(a));
}

function sortNewsletterNewestFirst(arr) {
  return arr.slice().sort((a, b) => parseMMDDYY(b.date) - parseMMDDYY(a.date));
}

function loadSeenBadges() {
  try {
    const raw = localStorage.getItem(SEEN_BADGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSeenBadges(next) {
  try {
    localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function isBadgeSeen(kind, dateStr) {
  if (!kind || !dateStr) return false;
  const seen = loadSeenBadges();
  return !!seen?.[kind]?.[dateStr];
}

function markBadgeSeen(kind, dateStr) {
  if (!kind || !dateStr) return;
  const seen = loadSeenBadges();
  if (!seen[kind]) seen[kind] = {};
  seen[kind][dateStr] = true;
  saveSeenBadges(seen);
}

function weekLabel(dateStr) {
  return dateStr;
}

function normalizeChatIcon(src) {
  if (!src) return src;
  if (src === "images/template_emoji.png") return "images/briefcase_icon.svg";
  if (src === "images/notepad_emoji.png") return "images/document_search_icon.svg";
  if (src === "images/paws.png") return "images/wrench_gear_icon.svg";
  return src;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getChatIndexById(id) {
  return savedChats.findIndex((c) => c.id === id);
}

function sortChatsMostRecentFirst() {
  savedChats.sort((a, b) => {
    const la = typeof a.lastActive === "number" ? a.lastActive : 0;
    const lb = typeof b.lastActive === "number" ? b.lastActive : 0;
    if (lb !== la) return lb - la;

    const ca = typeof a.createdAt === "number" ? a.createdAt : 0;
    const cb = typeof b.createdAt === "number" ? b.createdAt : 0;
    return cb - ca;
  });
}

function touchChat(id) {
  const idx = getChatIndexById(id);
  if (idx === -1) return;
  savedChats[idx].lastActive = Date.now();
  sortChatsMostRecentFirst();
}

/* ===============================
   Lightbox (click-to-zoom)
=============================== */
let lightboxOpen = false;

function openLightbox(src) {
  if (!src || lightboxOpen) return;
  lightboxOpen = true;

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const img = document.createElement("img");
  img.className = "lightbox-img";
  img.src = src;
  img.alt = "Preview";

  const closeBtn = document.createElement("button");
  closeBtn.className = "lightbox-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close image preview");
  closeBtn.textContent = "×";

  const cleanup = () => {
    overlay.remove();
    document.body.classList.remove("lightbox-open");
    document.removeEventListener("keydown", onKeyDown);
    lightboxOpen = false;
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") cleanup();
  };

  closeBtn.addEventListener("click", cleanup);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cleanup();
  });

  document.addEventListener("keydown", onKeyDown);

  overlay.appendChild(closeBtn);
  overlay.appendChild(img);

  document.body.appendChild(overlay);
  document.body.classList.add("lightbox-open");

  requestAnimationFrame(() => overlay.classList.add("show"));
}

document.addEventListener("click", (e) => {
  const img = e.target?.closest?.(".message img");
  if (!img) return;
  const src = img.getAttribute("src");
  openLightbox(src);
});

/* ===============================
   Link formatting
=============================== */
function escapeHTML(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkifyAndFormat(text) {
  const escaped = escapeHTML(text);
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;

  const withLinks = escaped.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return withLinks.replace(/\n/g, "<br>");
}

function setBubbleRichText(bubble, text) {
  if (!bubble) return;
  bubble.innerHTML = linkifyAndFormat(text);
}

function applyLinkifyToBubble(bubble) {
  if (!bubble) return;
  const raw = bubble.textContent || "";
  setBubbleRichText(bubble, raw);
}

/* ===============================
   Hardcoded replies
=============================== */
const HARDCODED_QA = [
  {
    kind: "text",
    q: "How do I calibrate the DFI sensor on a LR5?",
    a: `🛠️ How to Recalibrate the DFI Sensor on a Litter-Robot 5

If the waste drawer shows “Full” when it is empty, or the waste level reading is inaccurate, recalibrating the Drawer Full Indicator (DFI) can correct the issue.

🧹 Preparation
✅ Remove the waste drawer liner and clear out any debris
✅ If a liner sticker is present, place a plain white sheet of paper flat on the bottom of the drawer
✅ Reinsert the empty drawer (do not install a liner)
✅ Press the Cancel button once to reset the scale

⚠️ Important
✅ Turn the unit OFF with the Power button
❌ Do NOT unplug the unit

🔁 Calibration Button Sequence
Press the following buttons in this exact order, without pausing:
➡️ Connect → Cancel → Connect → Empty → Cycle

✅ Successful Calibration (What You’ll See)
✅ LEDs perform a lamp test (red, green, blue)
✅ Globe rotates to the Dump position
✅ Unit returns to the Home position
✅ Waste drawer level resets and displays accurately

❌ If Calibration Is Unsuccessful
• Confirm the drawer is empty and clean
• Ensure the drawer bottom is clearly visible
• Verify the unit was powered OFF with the Power button (not unplugged)
• Repeat the calibration steps carefully

🔗 Referenced from:
https://www.litter-robot.com/support/article/litter-robot-5-calibrate-drawer-full-indicator/`
  },
  {
    kind: "flow",
    id: "hopper_disconnected_lr5pro",
    q: "The cx is having issues with hopper disconnected on their LR5 Pro with no hopper attached."
  }
];

function normalizePrompt(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeLoose(s) {
  return normalizePrompt(s)
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s\-?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* Simplified:
   - Only trigger part identification if the SAME message has an image attached
     AND the text includes "what part is this" or "what is this part".
*/
function resolveHardcoded(userText, hasImageAttachedThisMessage) {
  const raw = (userText || "").trim().toLowerCase();
  const loose = normalizeLoose(userText);

  if (hasImageAttachedThisMessage) {
    const wantsPart =
      raw.length === 0 ||
      raw.length < 20 ||
      raw.includes("?") ||
      loose.includes("what is this") ||
      loose.includes("what part") ||
      loose.includes("this part") ||
      loose.includes("identify") ||
      loose.includes("help");

    if (wantsPart) {
      const skuLink = "https://www.litter-robot.com/products/globe-liner-weight.html?sku=PLY-GLW-1001";
      return {
        type: "imageAnswer",
        text: `This appears to be the Globe Liner Weight.

Plystick SKU - ${skuLink}`,
        imageSrc: "images/LinerWeight_bot.jpg"
      };
    }
  }

  const hasLr5 = loose.includes("lr5");
  const hasDfiOrSensor = loose.includes("dfi") || loose.includes("sensor");
  const hasCalibrate =
    loose.includes("calibrate") || loose.includes("calibration") || loose.includes("reset");

  if (hasLr5 && hasDfiOrSensor && hasCalibrate) {
    const pair = HARDCODED_QA.find((p) => p.kind === "text");
    if (pair) return { type: "text", text: pair.a };
  }

  const hasHopper = loose.includes("hopper");
  const hasDisconnected =
    loose.includes("disconnected") || loose.includes("not attached") || loose.includes("error");
  const hasLr5OrPro = loose.includes("lr5") || loose.includes("lr5 pro");

  if (hasHopper && hasDisconnected && hasLr5OrPro) {
    return { type: "flow", id: "hopper_disconnected_lr5pro" };
  }

  return null;
}

function resolveKeywordTriggers(userText) {
  const loose = normalizeLoose(userText);

  const hasSkuOrPart = loose.includes("sku") || loose.includes("part number");
  const hasLr5 = loose.includes("lr5");
  const hasBase = loose.includes("base");
  const hasBlack = loose.includes("black");

  if ((hasLr5 && hasSkuOrPart) || (hasLr5 && hasBase && hasBlack)) {
    return { type: "text", text: "Litter-Robot 5 Base (Black)\nSKU LR5-123-4567" };
  }

  const hasCx = loose.includes("cx");
  const hasIssue = loose.includes("issue");
  const hasTrackerOrIssue = loose.includes("tracker") || loose.includes("issue");
  const hasLink =
    loose.includes("link") || loose.includes("sheet") || loose.includes("excel");

  if (hasCx && hasTrackerOrIssue && hasLink) {
    return { type: "cxTracker" };
  }

  return null;
}

/* ===============================
   Welcome banner
=============================== */
function showWelcomeBanner() {
  if (isReadOnlyMode || welcomeDismissed) return;

  const banner = document.getElementById("welcomeBanner");
  const messages = document.getElementById("messages");
  if (!banner || !messages) return;

  if (messages.children.length !== 0) return;

  banner.classList.remove("hidden");
  banner.classList.remove("show");
  void banner.offsetWidth;
  banner.classList.add("show");
}

function hideWelcomeBanner() {
  const banner = document.getElementById("welcomeBanner");
  if (!banner) return;

  welcomeDismissed = true;
  banner.classList.remove("show");
  banner.classList.add("hidden");
}

/* ===============================
   Read-only mode
=============================== */
function setReadOnlyMode(on) {
  isReadOnlyMode = on;

  const inputArea = document.getElementById("inputArea");
  if (inputArea) inputArea.classList.toggle("hidden", on);

  if (on) {
    pendingImageDataUrl = null;
    pendingImageName = null;
    pendingImageLoading = false;
    hideAttachmentPreview();

    const input = document.getElementById("userInput");
    if (input) {
      input.value = "";
      input.style.height = "auto";
    }

    hideWelcomeBanner();
  }

  updateSendButtonState();
}

/* ===============================
   Home action
=============================== */
function goHome() {
  startNewChat();
}

/* ===============================
   Send button state
=============================== */
function updateSendButtonState() {
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  if (!sendBtn || !input) return;

  if (isReadOnlyMode) {
    sendBtn.disabled = true;
    return;
  }

  if (pendingImageLoading) {
    sendBtn.disabled = true;
    return;
  }

  sendBtn.disabled = !input.value.trim() && !pendingImageDataUrl;
}

/* ===============================
   Attachment preview pill
=============================== */
let attachmentPreviewEl = null;

function ensureAttachmentPreview() {
  if (attachmentPreviewEl) return attachmentPreviewEl;

  const wrapper = document.querySelector(".input-wrapper");
  if (!wrapper) return null;

  const pill = document.createElement("div");
  pill.className = "attach-pill";
  pill.style.display = "none";

  const thumb = document.createElement("img");
  thumb.className = "attach-thumb";
  thumb.alt = "Attached image";

  const labelWrap = document.createElement("div");
  labelWrap.className = "attach-label";

  const title = document.createElement("div");
  title.className = "attach-title";
  title.textContent = "Image attached";

  const filename = document.createElement("div");
  filename.className = "attach-filename";
  filename.textContent = "";

  labelWrap.appendChild(title);
  labelWrap.appendChild(filename);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "attach-remove";
  removeBtn.textContent = "×";
  removeBtn.setAttribute("aria-label", "Remove attachment");
  removeBtn.title = "Remove";

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    pendingImageDataUrl = null;
    pendingImageName = null;
    pendingImageLoading = false;

    const input = document.getElementById("imageInput");
    if (input) input.value = "";

    pill.style.display = "none";
    updateSendButtonState();
  });

  pill.appendChild(thumb);
  pill.appendChild(labelWrap);
  pill.appendChild(removeBtn);

  const textarea = document.getElementById("userInput");
  if (textarea) wrapper.insertBefore(pill, textarea);
  else wrapper.appendChild(pill);

  attachmentPreviewEl = pill;
  return attachmentPreviewEl;
}

function showAttachmentPreview(dataUrl, name) {
  const pill = ensureAttachmentPreview();
  if (!pill) return;

  const thumb = pill.querySelector(".attach-thumb");
  const filename = pill.querySelector(".attach-filename");

  if (thumb) thumb.src = dataUrl;
  if (filename) filename.textContent = name || "";

  pill.style.display = "flex";
}

function hideAttachmentPreview() {
  const pill = ensureAttachmentPreview();
  if (!pill) return;
  pill.style.display = "none";
}

/* ===============================
   Dropdowns
=============================== */
function toggleSavedChatsDropdown() {
  const list = document.getElementById("savedChatsList");
  const toggle = document.getElementById("savedChatsToggle");

  updateSavedChatsDropdown();

  isSavedChatsVisible = !isSavedChatsVisible;

  if (list) list.classList.toggle("open", isSavedChatsVisible);
  if (toggle) toggle.classList.toggle("open", isSavedChatsVisible);
}

function toggleAnnouncements() {
  const list = document.getElementById("announcementsList");
  const toggle = document.getElementById("announcementsToggle");
  if (!list || !toggle) return;

  isAnnouncementsVisible = !isAnnouncementsVisible;
  toggle.classList.toggle("open", isAnnouncementsVisible);
  list.style.display = isAnnouncementsVisible ? "flex" : "none";

  if (isAnnouncementsVisible) renderAnnouncementsUI();
}

function toggleHuddles() {
  const list = document.getElementById("huddlesList");
  const toggle = document.getElementById("huddlesToggle");
  if (!list || !toggle) return;

  isHuddlesVisible = !isHuddlesVisible;
  toggle.classList.toggle("open", isHuddlesVisible);
  list.style.display = isHuddlesVisible ? "flex" : "none";

  if (isHuddlesVisible) renderHuddlesUI();
}

function toggleNewsletters() {
  const list = document.getElementById("newslettersList");
  const toggle = document.getElementById("newslettersToggle");
  if (!list || !toggle) return;

  isNewslettersVisible = !isNewslettersVisible;
  toggle.classList.toggle("open", isNewslettersVisible);
  list.style.display = isNewslettersVisible ? "flex" : "none";

  if (isNewslettersVisible) renderNewslettersUI();
}

/* ===============================
   Popups
=============================== */
function closeActivePopup() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
}

/* ===============================
   Theme (chat only)
=============================== */
function applyTheme(mode) {
  themeMode = mode === "dark" ? "dark" : "light";

  const chatContainer = document.getElementById("chatContainer");
  if (chatContainer) chatContainer.classList.toggle("dark-mode", themeMode === "dark");

  const lightBtn = document.getElementById("themeLightBtn");
  const darkBtn = document.getElementById("themeDarkBtn");
  if (lightBtn && darkBtn) {
    lightBtn.classList.toggle("active", themeMode === "light");
    darkBtn.classList.toggle("active", themeMode === "dark");
  }

  localStorage.setItem("whiskerThemeMode", themeMode);
}

function loadTheme() {
  const saved = localStorage.getItem("whiskerThemeMode");
  applyTheme(saved === "dark" ? "dark" : "light");
}

function toggleSettingsMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById("settingsMenu");
  if (!menu) return;

  isSettingsMenuOpen = !isSettingsMenuOpen;
  menu.classList.toggle("open", isSettingsMenuOpen);
  menu.setAttribute("aria-hidden", String(!isSettingsMenuOpen));
}

function closeSettingsMenu() {
  const menu = document.getElementById("settingsMenu");
  if (!menu) return;

  isSettingsMenuOpen = false;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
}

/* ===============================
   Bottom icons
=============================== */
function openLogin() {
  alert("Login clicked (placeholder).");
}

/* ===============================
   Announcements UI
=============================== */
function renderAnnouncementsUI() {
  const pin = document.getElementById("announcementPin");
  const pinDate = document.getElementById("announcementPinDate");
  const list = document.getElementById("announcementsList");
  if (!pin || !pinDate || !list) return;

  const dates = sortDatesNewestFirst(Object.keys(ANNOUNCEMENTS));
  const newest = dates[0];

  pinDate.textContent = newest;
  pin.onclick = () => {
    markBadgeSeen("announcements", newest);
    renderAnnouncementsUI();
    openAnnouncement(newest);
  };
  const badge = pin.querySelector(".badge-new");
  if (badge) badge.style.display = isBadgeSeen("announcements", newest) ? "none" : "";

  list.innerHTML = "";
  dates.forEach((d) => {
    if (d === newest) return;
    const item = document.createElement("div");
    item.className = "announcement-item";
    item.textContent = d;
    const itemBadge = document.createElement("span");
    itemBadge.className = "badge-new";
    itemBadge.textContent = "NEW";
    itemBadge.style.display =
      d === newest && !isBadgeSeen("announcements", d) ? "" : "none";
    item.appendChild(itemBadge);
    item.onclick = () => {
      markBadgeSeen("announcements", d);
      renderAnnouncementsUI();
      openAnnouncement(d);
    };
    list.appendChild(item);
  });
}

function openAnnouncement(dateStr) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  markBadgeSeen("announcements", dateStr);
  const pin = document.getElementById("announcementPin");
  const badge = pin?.querySelector?.(".badge-new");
  if (badge) badge.style.display = "none";

  setReadOnlyMode(true);
  closeActivePopup();
  closeSettingsMenu();

  messages.innerHTML = "";

  const lines = ANNOUNCEMENTS[dateStr] || [`📌 Update — ${dateStr}`, "No content added yet."];
  const blocks = Array.isArray(lines[0]) || typeof lines[0] === "object" ? lines : [lines];

  blocks.forEach((block) => {
    const bubble = document.createElement("div");
    bubble.className = "message assistant";

    const meta = document.createElement("div");
    meta.className = "resource-header";
    meta.style.fontSize = "12px";
    meta.style.opacity = "0.8";
    const author = block?.author || "Ryan Lewis";
    const time = block?.time || "9:00 AM";
    const avatar = document.createElement("span");
    avatar.className = "resource-avatar";
    avatar.textContent = (author || "R").trim().charAt(0).toUpperCase();
    const metaText = document.createElement("span");
    metaText.textContent = `${author} · ${time}`;
    meta.appendChild(avatar);
    meta.appendChild(metaText);
    bubble.appendChild(meta);

    const header = document.createElement("div");
    header.style.fontWeight = "700";
    header.style.fontSize = "16px";
    header.textContent = block?.title || block[0];
    bubble.appendChild(header);

    const bodyLines = block?.lines || block.slice(1);
    bodyLines.forEach((line) => {
      const p = document.createElement("div");
      p.style.marginTop = "10px";
      p.style.opacity = "0.95";
      p.textContent = line;
      bubble.appendChild(p);
    });

    messages.appendChild(bubble);
  });
  messages.scrollTop = messages.scrollHeight;
  updateJumpButton();
}

/* ===============================
   Huddles UI
=============================== */
function renderHuddlesUI() {
  const pin = document.getElementById("huddlePin");
  const pinDate = document.getElementById("huddlePinDate");
  const list = document.getElementById("huddlesList");
  if (!pin || !pinDate || !list) return;

  const dates = sortDatesNewestFirst(Object.keys(HUDDLES));
  const newest = dates[0];

  pinDate.textContent = weekLabel(newest);
  pin.onclick = () => {
    markBadgeSeen("huddles", newest);
    renderHuddlesUI();
    openHuddle(newest);
  };
  const badge = pin.querySelector(".badge-new");
  if (badge) badge.style.display = isBadgeSeen("huddles", newest) ? "none" : "";

  list.innerHTML = "";
  dates.forEach((d) => {
    if (d === newest) return;
    const item = document.createElement("div");
    item.className = "huddle-item";
    item.textContent = weekLabel(d);
    const itemBadge = document.createElement("span");
    itemBadge.className = "badge-new";
    itemBadge.textContent = "NEW";
    itemBadge.style.display =
      d === newest && !isBadgeSeen("huddles", d) ? "" : "none";
    item.appendChild(itemBadge);
    item.onclick = () => {
      markBadgeSeen("huddles", d);
      renderHuddlesUI();
      openHuddle(d);
    };
    list.appendChild(item);
  });
}

function openHuddle(dateStr) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  markBadgeSeen("huddles", dateStr);
  const pin = document.getElementById("huddlePin");
  const badge = pin?.querySelector?.(".badge-new");
  if (badge) badge.style.display = "none";

  setReadOnlyMode(true);
  closeActivePopup();
  closeSettingsMenu();

  messages.innerHTML = "";

  const data = HUDDLES[dateStr] || {
    title: `🎥 Weekly Huddle — ${dateStr}`,
    bodyLines: ["No content added yet."],
    videoSrc: ""
  };

  const bubble = document.createElement("div");
  bubble.className = "message assistant";

  const meta = document.createElement("div");
  meta.style.fontSize = "12px";
  meta.style.opacity = "0.8";
  const author = data.author || "Whisker Team";
  const time = data.time || "—";
  meta.textContent = `${author} · ${time}`;
  bubble.appendChild(meta);

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.textContent = data.title;
  bubble.appendChild(title);

  data.bodyLines.forEach((line) => {
    const p = document.createElement("div");
    p.style.marginTop = "10px";
    p.style.opacity = "0.95";
    p.textContent = line;
    bubble.appendChild(p);
  });

  if (data.videoSrc) {
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.src = data.videoSrc;
    bubble.appendChild(video);
  }

  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  updateJumpButton();
}

/* ===============================
   Newsletters UI
=============================== */
function renderNewslettersUI() {
  const pin = document.getElementById("newsletterPin");
  const pinDate = document.getElementById("newsletterPinDate");
  const list = document.getElementById("newslettersList");
  if (!pin || !pinDate || !list) return;

  const sorted = sortNewsletterNewestFirst(NEWSLETTERS);
  const newest = sorted[0];

  pinDate.textContent = newest?.date || "";
  pin.onclick = () => {
    markBadgeSeen("newsletters", newest?.date);
    renderNewslettersUI();
    openNewsletter(newest?.date);
  };
  const badge = pin.querySelector(".badge-new");
  if (badge) badge.style.display = isBadgeSeen("newsletters", newest?.date) ? "none" : "";

  list.innerHTML = "";
  sorted.forEach((n) => {
    if (n.date === newest?.date) return;
    const item = document.createElement("div");
    item.className = "newsletter-item";
    item.textContent = n.date;
    const itemBadge = document.createElement("span");
    itemBadge.className = "badge-new";
    itemBadge.textContent = "NEW";
    itemBadge.style.display =
      n.date === newest?.date && !isBadgeSeen("newsletters", n.date) ? "" : "none";
    item.appendChild(itemBadge);
    item.onclick = () => {
      markBadgeSeen("newsletters", n.date);
      renderNewslettersUI();
      openNewsletter(n.date);
    };
    list.appendChild(item);
  });
}

function openNewsletter(dateStr) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  markBadgeSeen("newsletters", dateStr);
  const pin = document.getElementById("newsletterPin");
  const badge = pin?.querySelector?.(".badge-new");
  if (badge) badge.style.display = "none";

  setReadOnlyMode(true);
  closeActivePopup();
  closeSettingsMenu();

  messages.innerHTML = "";

  const data = NEWSLETTERS.find((n) => n.date === dateStr) || {
    title: `📰 Weekly Newsletter — ${dateStr || "N/A"}`,
    date: dateStr || "",
    bodyLines: ["No content added yet."]
  };

  const bubble = document.createElement("div");
  bubble.className = "message assistant";

  const meta = document.createElement("div");
  meta.style.fontSize = "12px";
  meta.style.opacity = "0.8";
  const author = data.author || "Whisker Team";
  const time = data.time || "—";
  meta.textContent = `${author} · ${time}`;
  bubble.appendChild(meta);

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.textContent = data.title;
  bubble.appendChild(title);

  if (data.date) {
    const dateLine = document.createElement("div");
    dateLine.style.marginTop = "6px";
    dateLine.style.opacity = "0.9";
    dateLine.textContent = data.date;
    bubble.appendChild(dateLine);
  }

  data.bodyLines.forEach((line) => {
    const p = document.createElement("div");
    p.style.marginTop = "10px";
    p.style.opacity = "0.95";
    p.textContent = line;
    bubble.appendChild(p);
  });

  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  updateJumpButton();
}

/* ===============================
   Chat bubbles + streaming
=============================== */
function createMessageBubble(messagesEl, role, initialText = "") {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.textContent = initialText;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  updateJumpButton();
  return bubble;
}

function createThinkingBubble(messagesEl) {
  const bubble = createMessageBubble(messagesEl, "assistant", "Thinking…");
  bubble.setAttribute("data-thinking", "true");
  return bubble;
}

function streamTextIntoBubble(bubble, fullText, onDone) {
  if (!bubble) return;

  bubble.removeAttribute("data-thinking");
  bubble.textContent = "";

  let i = 0;

  function delayForChar(ch, nextCh) {
    let base = 2 + Math.floor(Math.random() * 4);
    if (ch === " ") base = 1 + Math.floor(Math.random() * 2);

    if (".!?".includes(ch)) base = 26 + Math.floor(Math.random() * 32);
    if (",:;".includes(ch)) base = 12 + Math.floor(Math.random() * 16);

    if (ch === "\n") base = 12 + Math.floor(Math.random() * 16);
    if (ch === "\n" && nextCh === "\n") base = 40 + Math.floor(Math.random() * 30);

    return base;
  }

  const tick = () => {
    const ch = fullText.charAt(i);
    const nextCh = fullText.charAt(i + 1);

    bubble.textContent += ch;
    i++;

    const messages = document.getElementById("messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
    updateJumpButton();

    if (i < fullText.length) {
      setTimeout(tick, delayForChar(ch, nextCh));
    } else {
      applyLinkifyToBubble(bubble);
      if (typeof onDone === "function") onDone();
      updateJumpButton();
    }
  };

  tick();
}

/* ===============================
   Add message helpers
=============================== */
function createChatIfNeeded() {
  if (currentChatId) return;

  const now = Date.now();
  const newChat = {
    id: makeId(),
    name: `Chat ${savedChats.length + 1}`,
    conversation: [],
    icon: "images/paws.png",
    createdAt: now,
    lastActive: now
  };

  savedChats.push(newChat);
  currentChatId = newChat.id;

  sortChatsMostRecentFirst();
}

function addUserMessage(text, imageDataUrl = null) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const userBubble = createMessageBubble(messages, "user", "");
  if (text) userBubble.textContent = text;

  if (imageDataUrl) {
    const img = document.createElement("img");
    img.src = imageDataUrl;
    userBubble.appendChild(img);
  }

  createChatIfNeeded();

  const idx = getChatIndexById(currentChatId);
  if (idx !== -1) {
    savedChats[idx].conversation.push({
      role: "user",
      text: text || "",
      image: imageDataUrl || null
    });
  }
}

function addAssistantStreamed(text, { save = true, imageSrc = null } = {}) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const thinking = createThinkingBubble(messages);

  setTimeout(() => {
    streamTextIntoBubble(thinking, text, () => {
      if (imageSrc) {
        const img = document.createElement("img");
        img.src = imageSrc;
        thinking.appendChild(img);
        const msgEl = document.getElementById("messages");
        if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;
      }

      if (save) {
        createChatIfNeeded();
        const idx2 = getChatIndexById(currentChatId);
        if (idx2 !== -1) {
          savedChats[idx2].conversation.push({
            role: "assistant",
            text,
            image: imageSrc || null
          });
        }
        touchChat(currentChatId);
        updateSavedChatsDropdown();
      }
      updateJumpButton();
    });
  }, 160);
}

function addAssistantRichHTML(html, { save = true, plainText = "" } = {}) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const bubble = document.createElement("div");
  bubble.className = "message assistant";
  bubble.innerHTML = html;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;

  if (save) {
    createChatIfNeeded();
    const idx = getChatIndexById(currentChatId);
    if (idx !== -1) {
      savedChats[idx].conversation.push({
        role: "assistant",
        text: plainText || ""
      });
    }
    touchChat(currentChatId);
    updateSavedChatsDropdown();
  }

  updateJumpButton();
}

/* ===============================
   Flow: Hopper disconnected
=============================== */
function runFlow_HopperDisconnected_LR5Pro() {
  const messages = document.getElementById("messages");
  if (!messages) return;

  createChatIfNeeded();

  const refLink = "https://chat.google.com/room/PLACEHOLDER_REFERENCE";

  const intro =
`🛠️ LR5 Pro — “Hopper Disconnected” (No Hopper Attached)

Please advise the customer to complete these steps in order:

1) 🔌 Hard power cycle
• Unplug the unit from the wall outlet for about 90 seconds
• Plug the unit back in
• Wait for a steady white light

2) ♻️ Factory reset
• With the unit on a white light, press and hold Cancel + Cycle for about 3 seconds

🔗 Referenced from:
${refLink}

Did the “Hopper Disconnected” message clear after completing both steps?`;

  const thinking = createThinkingBubble(messages);

  setTimeout(() => {
    streamTextIntoBubble(thinking, intro, () => {
      const choices = document.createElement("div");
      choices.className = "choice-row";

      const yesBtn = document.createElement("button");
      yesBtn.type = "button";
      yesBtn.className = "choice-btn";
      yesBtn.textContent = "Yes";

      const noBtn = document.createElement("button");
      noBtn.type = "button";
      noBtn.className = "choice-btn";
      noBtn.textContent = "No";

      const disableBoth = () => {
        yesBtn.disabled = true;
        noBtn.disabled = true;
        choices.classList.add("disabled");
      };

      yesBtn.addEventListener("click", () => {
        if (isReadOnlyMode) return;
        disableBoth();

        addUserMessage("Yes");
        touchChat(currentChatId);
        updateSavedChatsDropdown();

        addAssistantStreamed(
`✅ Great — the unit can be returned to normal use.

If the message returns, proceed with curtain sensor cleaning and re-check after a manual cycle.

🔗 Referenced from:
${refLink}`
        );
      });

      noBtn.addEventListener("click", () => {
        if (isReadOnlyMode) return;
        disableBoth();

        addUserMessage("No");
        touchChat(currentChatId);
        updateSavedChatsDropdown();

        addAssistantStreamed(
`Next steps: clean curtain sensors and run a manual cycle.

1) 🧼 Clean curtain sensors
• Have the customer clean the curtain sensors located near the top of the unit
• Ensure the sensor area is free of dust, litter, or residue

2) 🔄 Run a manual cycle
• Run a manual cycle and confirm whether the issue persists

If the issue is still persisting after cleaning and a manual cycle:
• Verify the customer’s shipping address
• Proceed with sending a replacement unit

🔗 Referenced from:
${refLink}`
        );
      });

      choices.appendChild(yesBtn);
      choices.appendChild(noBtn);
      thinking.appendChild(choices);

      const msgEl = document.getElementById("messages");
      if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;

      const idx2 = getChatIndexById(currentChatId);
      if (idx2 !== -1) {
        savedChats[idx2].conversation.push({ role: "assistant", text: intro });
      }

      touchChat(currentChatId);
      updateSavedChatsDropdown();
      updateJumpButton();
    });
  }, 160);
}

/* ===============================
   Chat load / create / send
=============================== */
function loadChatById(chatId) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  setReadOnlyMode(false);
  closeActivePopup();
  closeSettingsMenu();

  const index = getChatIndexById(chatId);
  if (index === -1) return;

  currentChatId = chatId;
  messages.innerHTML = "";

  const convo = savedChats[index]?.conversation || [];

  if (convo.length === 0) {
    welcomeDismissed = false;
    showWelcomeBanner();
    updateSavedChatsDropdown();
    updateSendButtonState();
    updateJumpButton();
    return;
  }

  hideWelcomeBanner();

  convo.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `message ${msg.role === "user" ? "user" : "assistant"}`;

    if (msg.text) {
      if (msg.role === "assistant") setBubbleRichText(bubble, msg.text);
      else bubble.textContent = msg.text;
    }

    if (msg.image) {
      const img = document.createElement("img");
      img.src = msg.image;
      bubble.appendChild(img);
    }

    messages.appendChild(bubble);
  });

  messages.scrollTop = messages.scrollHeight;
  updateSavedChatsDropdown();
  updateSendButtonState();
  updateJumpButton();
}

function startNewChat() {
  setReadOnlyMode(false);
  closeSettingsMenu();

  const messages = document.getElementById("messages");
  const input = document.getElementById("userInput");
  if (messages) messages.innerHTML = "";
  if (input) {
    input.value = "";
    input.style.height = "auto";
  }

  pendingImageDataUrl = null;
  pendingImageName = null;
  pendingImageLoading = false;
  hideAttachmentPreview();

  const now = Date.now();
  const newChat = {
    id: makeId(),
    name: `Chat ${savedChats.length + 1}`,
    conversation: [],
    icon: "images/paws.png",
    createdAt: now,
    lastActive: now
  };

  savedChats.push(newChat);
  currentChatId = newChat.id;

  sortChatsMostRecentFirst();

  welcomeDismissed = false;
  showWelcomeBanner();

  updateSavedChatsDropdown();
  updateSendButtonState();
  updateJumpButton();
}

function sendMessage() {
  if (isReadOnlyMode) return;
  if (pendingImageLoading) return;

  if (sendLock) return;
  sendLock = true;
  setTimeout(() => {
    sendLock = false;
  }, 600);

  const input = document.getElementById("userInput");
  const messages = document.getElementById("messages");
  if (!input || !messages) return;

  const text = input.value.trim();
  const hasAttachment = !!pendingImageDataUrl;

  if (!text && !hasAttachment) return;

  createChatIfNeeded();
  hideWelcomeBanner();

  const sentImage = hasAttachment ? pendingImageDataUrl : null;

  addUserMessage(text || "", sentImage);

  input.value = "";
  input.style.height = "auto";

  pendingImageDataUrl = null;
  pendingImageName = null;
  pendingImageLoading = false;
  hideAttachmentPreview();

  const imageInput = document.getElementById("imageInput");
  if (imageInput) imageInput.value = "";

  updateSendButtonState();

  touchChat(currentChatId);
  updateSavedChatsDropdown();

  const resolved = resolveHardcoded(text, !!sentImage);
  const keywordResolved = !resolved ? resolveKeywordTriggers(text) : null;

  /* If user sends ONLY an image, do not send placeholder */
  if (!text && sentImage && !resolved) return;

  if (resolved && resolved.type === "flow" && resolved.id === "hopper_disconnected_lr5pro") {
    runFlow_HopperDisconnected_LR5Pro();
    return;
  }

  if (resolved && resolved.type === "imageAnswer") {
    addAssistantStreamed(resolved.text, { imageSrc: resolved.imageSrc });
    return;
  }

  if (resolved && resolved.type === "text") {
    addAssistantStreamed(resolved.text);
    return;
  }

  if (keywordResolved && keywordResolved.type === "text") {
    addAssistantStreamed(keywordResolved.text);
    return;
  }

  if (keywordResolved && keywordResolved.type === "cxTracker") {
    const html = `
<div>Here is the link for the "CX Issue Tracker":</div>
<a href="https://example.com/cx-issue-tracker" target="_blank" rel="noopener noreferrer">CX Issue Tracker</a>
<div style="margin-top: 8px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); display: inline-block;">
  <div>CX Issue Tracker.xlsx</div>
  <div style="font-size: 12px; opacity: 0.8;">Excel file (placeholder)</div>
</div>`;
    addAssistantRichHTML(html, {
      plainText: 'Here is the link for the "CX Issue Tracker":\nCX Issue Tracker\nCX Issue Tracker.xlsx'
    });
    return;
  }

  addAssistantStreamed("This is a placeholder response.");
}

/* ===============================
   Rename / Change Icon popup
=============================== */
function startInlineRename(chat) {
  closeActivePopup();

  const list = document.getElementById("savedChatsList");
  if (!list) return;

  const row = list.querySelector(`[data-chat-id="${chat.id}"]`);
  if (!row) return;

  const nameSpan = row.querySelector(".chat-name");
  if (!nameSpan) return;

  const input = document.createElement("input");
  input.className = "chat-rename-input";
  input.value = chat.name;

  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("mousedown", (e) => e.stopPropagation());

  const finish = () => {
    const next = input.value.trim();
    chat.name = next || chat.name;
    touchChat(chat.id);
    updateSavedChatsDropdown();
  };

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
    if (e.key === "Escape") {
      updateSavedChatsDropdown();
    }
  });

  row.replaceChild(input, nameSpan);

  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function updateSavedChatsDropdown() {
  const list = document.getElementById("savedChatsList");
  if (!list) return;

  sortChatsMostRecentFirst();
  list.innerHTML = "";
  list.classList.remove("has-items");

  savedChats.forEach((chat) => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-item";
    chatItem.setAttribute("data-chat-id", chat.id);

    if (chat.id === currentChatId && !isReadOnlyMode) chatItem.classList.add("active");

    chatItem.addEventListener("click", (e) => {
      if (e.target.classList?.contains("ellipsis")) return;
      if (e.target.classList?.contains("chat-rename-input")) return;
      loadChatById(chat.id);
    });


    const nameSpan = document.createElement("span");
    nameSpan.className = "chat-name";
    nameSpan.textContent = chat.name;

    const ellipsis = document.createElement("span");
    ellipsis.className = "ellipsis";
    ellipsis.textContent = "⋮";

    ellipsis.addEventListener("click", (e) => {
      e.stopPropagation();
      closeActivePopup();
      closeSettingsMenu();

      const popup = document.createElement("div");
      popup.className = "rename-popup";

      const renameBtn = document.createElement("button");
      renameBtn.textContent = "Rename";

      popup.append(renameBtn);

      renameBtn.onclick = () => {
        closeActivePopup();
        startInlineRename(chat);
      };

      document.body.appendChild(popup);
      const r = ellipsis.getBoundingClientRect();
      popup.style.top = r.top + "px";
      popup.style.left = r.right + 8 + "px";
      popup.style.display = "flex";
      activePopup = popup;
    });

    chatItem.append(nameSpan, ellipsis);
    list.appendChild(chatItem);
  });

  if (savedChats.length > 0) list.classList.add("has-items");
}

/* ===============================
   Scroll-to-bottom arrow
=============================== */
function isAtBottom() {
  const messages = document.getElementById("messages");
  if (!messages) return true;
  const gap = messages.scrollHeight - (messages.scrollTop + messages.clientHeight);
  return gap < 120;
}

function updateJumpButton() {
  const btn = document.getElementById("jumpToBottomBtn");
  const messages = document.getElementById("messages");
  if (!btn || !messages) return;

  if (isAtBottom() || messages.children.length === 0) btn.classList.remove("show");
  else btn.classList.add("show");
}

function jumpToBottom() {
  const messages = document.getElementById("messages");
  if (!messages) return;
  messages.scrollTop = messages.scrollHeight;
  updateJumpButton();
}

/* ===============================
   Global click handlers
=============================== */
document.addEventListener("click", (e) => {
  if (activePopup) {
    if (!activePopup.contains(e.target) && !e.target.classList?.contains("ellipsis")) {
      closeActivePopup();
    }
  }

  const menu = document.getElementById("settingsMenu");
  const settingsIcon = document.getElementById("settingsIcon");
  if (isSettingsMenuOpen && menu) {
    const clickedMenu = menu.contains(e.target);
    const clickedIcon = settingsIcon ? settingsIcon.contains(e.target) : false;
    if (!clickedMenu && !clickedIcon) closeSettingsMenu();
  }
});

/* ===============================
   Input handlers
=============================== */
const textarea = document.getElementById("userInput");
const inputWrapper = document.querySelector(".input-wrapper");

if (textarea) {
  textarea.addEventListener("focus", () => hideWelcomeBanner());
  textarea.addEventListener("mousedown", () => hideWelcomeBanner());

  textarea.addEventListener("input", function () {
    if (isReadOnlyMode) return;

    if (this.value.trim().length > 0) hideWelcomeBanner();

    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
    updateSendButtonState();
  });

  textarea.addEventListener("keydown", function (e) {
    if (isReadOnlyMode) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

if (inputWrapper) {
  inputWrapper.addEventListener("click", () => hideWelcomeBanner());
}

/* Image attach */
const addImageBtn = document.getElementById("addImageBtn");
const imageInput = document.getElementById("imageInput");

if (addImageBtn && imageInput) {
  addImageBtn.addEventListener("click", () => {
    if (isReadOnlyMode) return;
    imageInput.value = "";
    imageInput.click();
  });

  imageInput.addEventListener("change", () => {
    if (isReadOnlyMode) return;

    const file = imageInput.files?.[0];
    if (!file) return;

    pendingImageLoading = true;
    updateSendButtonState();

    const reader = new FileReader();
    reader.onload = () => {
      pendingImageDataUrl = reader.result;
      pendingImageName = file.name || "image";

      pendingImageLoading = false;

      hideWelcomeBanner();
      showAttachmentPreview(pendingImageDataUrl, pendingImageName);
      updateSendButtonState();
    };

    reader.onerror = () => {
      pendingImageLoading = false;
      pendingImageDataUrl = null;
      pendingImageName = null;
      hideAttachmentPreview();
      updateSendButtonState();
    };

    reader.readAsDataURL(file);
  });
}

/* Send */
const sendBtn = document.getElementById("sendBtn");
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    if (isReadOnlyMode) return;
    sendMessage();
  });
}

/* Theme buttons */
const themeLightBtn = document.getElementById("themeLightBtn");
const themeDarkBtn = document.getElementById("themeDarkBtn");
if (themeLightBtn) themeLightBtn.addEventListener("click", () => applyTheme("light"));
if (themeDarkBtn) themeDarkBtn.addEventListener("click", () => applyTheme("dark"));

/* Messages scroll listener */
const messagesEl = document.getElementById("messages");
if (messagesEl) {
  messagesEl.addEventListener("scroll", () => updateJumpButton());
}

/* Jump button */
const jumpBtn = document.getElementById("jumpToBottomBtn");
if (jumpBtn) {
  jumpBtn.addEventListener("click", () => jumpToBottom());
}

/* ===============================
   Init
=============================== */
setReadOnlyMode(false);
loadTheme();

renderAnnouncementsUI();
renderHuddlesUI();
renderNewslettersUI();

updateSavedChatsDropdown();
updateSendButtonState();

welcomeDismissed = false;
showWelcomeBanner();

updateJumpButton();

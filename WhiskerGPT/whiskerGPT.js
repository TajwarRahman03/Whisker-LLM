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

let welcomeDismissed = false;

let themeMode = "light";
let isSettingsMenuOpen = false;

/* Strong send lock to prevent double-send placeholder issues */
let sendLock = false;

/* ===============================
   Static data
=============================== */
const ANNOUNCEMENTS = {
  "11/10/25": [
    "📌 Update — 11/10/25",
    "This is a placeholder announcement page.",
    "Add your real update text here later."
  ],
  "12/25/25": [
    "🎄 Update — 12/25/25",
    "Holiday update placeholder.",
    "More details can go here in separate bubbles."
  ],
  "1/1/26": [
    "🚀 NEW — 1/1/26",
    "Welcome to WhiskerGPT Announcements + Updates!",
    "This section is read-only and is not saved as a chat."
  ]
};

const HUDDLES = {
  "11/10/25": {
    title: "🎥 Weekly Huddle — 11/10/25",
    bodyLines: [
      "Placeholder notes for this weekly huddle.",
      "Add your key talking points here.",
      "Date: 11/10/25"
    ],
    videoSrc: "huddle_videos/video_placeholder.mp4"
  },
  "12/25/25": {
    title: "🎥 Weekly Huddle — 12/25/25",
    bodyLines: [
      "Holiday week huddle placeholder.",
      "Add any updates and action items here.",
      "Date: 12/25/25"
    ],
    videoSrc: "huddle_videos/video_placeholder.mp4"
  },
  "1/1/26": {
    title: "🎥 Weekly Huddle — 1/1/26",
    bodyLines: [
      "New Year huddle placeholder.",
      "Add the agenda, outcomes, and next steps here.",
      "Date: 1/1/26"
    ],
    videoSrc: "huddle_videos/video_placeholder.mp4"
  }
};

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

function weekLabel(dateStr) {
  return `Week of ${dateStr}`;
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
  const exactNorm = normalizePrompt(userText);

  for (const pair of HARDCODED_QA) {
    if (exactNorm === normalizePrompt(pair.q)) {
      if (pair.kind === "flow") return { type: "flow", id: pair.id };
      return { type: "text", text: pair.a };
    }
  }

  const loose = normalizeLoose(userText);

  if (hasImageAttachedThisMessage) {
    const wantsPart =
      loose.includes("what part is this") ||
      loose.includes("what is this part") ||
      loose === "what part is this?" ||
      loose === "what is this part?";

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

  const hasPro = /\blr5\s*pro\b/.test(loose);
  const hasHopper = /\bhopper\b/.test(loose);
  const hasDisconnected = /\bdisconnected\b/.test(loose) || /\bdisconnect\b/.test(loose);
  const hasNoHopper =
    /\bno\b.*\bhopper\b/.test(loose) ||
    /\bwithout\b.*\bhopper\b/.test(loose) ||
    /\bnot\b.*\bhopper\b/.test(loose) ||
    /\bno\s+hopper\s+attached\b/.test(loose) ||
    /\bno\s+hopper\b/.test(loose);

  if (hasPro && hasHopper && hasDisconnected && hasNoHopper) {
    return { type: "flow", id: "hopper_disconnected_lr5pro" };
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
  pin.onclick = () => openAnnouncement(newest);

  list.innerHTML = "";
  dates.forEach((d) => {
    if (d === newest) return;
    const item = document.createElement("div");
    item.className = "announcement-item";
    item.textContent = d;
    item.onclick = () => openAnnouncement(d);
    list.appendChild(item);
  });
}

function openAnnouncement(dateStr) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  setReadOnlyMode(true);
  closeActivePopup();
  closeSettingsMenu();

  messages.innerHTML = "";

  const lines = ANNOUNCEMENTS[dateStr] || [`📌 Update — ${dateStr}`, "No content added yet."];

  const bubble = document.createElement("div");
  bubble.className = "message assistant";

  const header = document.createElement("div");
  header.style.fontWeight = "700";
  header.style.fontSize = "16px";
  header.textContent = lines[0];
  bubble.appendChild(header);

  lines.slice(1).forEach((line) => {
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
  pin.onclick = () => openHuddle(newest);

  list.innerHTML = "";
  dates.forEach((d) => {
    if (d === newest) return;
    const item = document.createElement("div");
    item.className = "huddle-item";
    item.textContent = weekLabel(d);
    item.onclick = () => openHuddle(d);
    list.appendChild(item);
  });
}

function openHuddle(dateStr) {
  const messages = document.getElementById("messages");
  if (!messages) return;

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

    const icon = document.createElement("img");
    icon.src = chat.icon || "images/paws.png";
    icon.className = "chat-icon saved-chat-icon";

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

      const iconBtn = document.createElement("button");
      iconBtn.textContent = "Change Icon";

      popup.append(renameBtn, iconBtn);

      renameBtn.onclick = () => {
        closeActivePopup();
        startInlineRename(chat);
      };

      iconBtn.onclick = (ev) => {
        ev.stopPropagation();
        popup.innerHTML = "";

        const iconContainer = document.createElement("div");
        iconContainer.style.display = "flex";
        iconContainer.style.gap = "10px";
        iconContainer.style.alignItems = "center";

        const options = [
          { src: "images/template_emoji.png", tooltip: "Templates", w: 34, h: 34 },
          { src: "images/notepad_emoji.png", tooltip: "Notes", w: 34, h: 34 },
          { src: "images/paws.png", tooltip: "Chat", w: 34, h: 34 }
        ];

        options.forEach((opt) => {
          const wrap = document.createElement("span");
          wrap.className = "icon-choice";
          wrap.setAttribute("data-tooltip", opt.tooltip);

          const img = document.createElement("img");
          img.src = opt.src;
          img.style.width = opt.w + "px";
          img.style.height = opt.h + "px";
          img.style.objectFit = "contain";
          img.style.cursor = "pointer";

          img.onclick = (clickEv) => {
            clickEv.stopPropagation();
            chat.icon = opt.src;
            touchChat(chat.id);
            updateSavedChatsDropdown();
            closeActivePopup();
          };

          wrap.appendChild(img);
          iconContainer.appendChild(wrap);
        });

        popup.appendChild(iconContainer);
        popup.style.display = "flex";
      };

      document.body.appendChild(popup);
      const r = ellipsis.getBoundingClientRect();
      popup.style.top = r.top + "px";
      popup.style.left = r.right + 8 + "px";
      popup.style.display = "flex";
      activePopup = popup;
    });

    chatItem.append(icon, nameSpan, ellipsis);
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
  if (isSettingsMenuOpen && menu && settingsIcon) {
    const clickedMenu = menu.contains(e.target);
    const clickedIcon = settingsIcon.contains(e.target);
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

updateSavedChatsDropdown();
updateSendButtonState();

welcomeDismissed = false;
showWelcomeBanner();

updateJumpButton();

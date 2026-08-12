// App State Management
let activeLeftMenu = null;
let activeRightMenu = null;
let db = null; 

// User Profile state
let profileData = {
  username: "Guest User",
  bio: "Accessing DreamJr Space...",
  role: "Member", // Default role assigned automatically
  avatar: "",
  joinTimestamp: Date.now()
};

// Secret Staff Token configuration
const STAFF_VERIFICATION_TOKEN = "DREAMJR_DEV_2026";

// Session Timer
setInterval(() => {
  const elapsed = Date.now() - profileData.joinTimestamp;
  const hours = String(Math.floor(elapsed / 3600000)).padStart(2, '0');
  const mins = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
  const timerEl = document.getElementById("session-timer");
  if (timerEl) {
    timerEl.innerText = `${hours}:${mins}:${secs}`;
  }
}, 1000);

// Initial setup on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  processAutoDeveloperCheck();

  const savedKey = localStorage.getItem("gemini_api_key");
  if (savedKey) {
    document.getElementById("gemini-key-input").value = savedKey;
  }
  
  const savedProfile = localStorage.getItem("dreamjr_profile");
  if (savedProfile) {
    profileData = JSON.parse(savedProfile);
  } else {
    profileData.username = "Ecosystem Member";
    profileData.role = "Member"; 
    localStorage.setItem("dreamjr_profile", JSON.stringify(profileData));
  }
  updateProfileDisplay();

  initIndexedDB();
  generateMockPlayers();
  setInterval(tickServerMetrics, 2000);
});

// Auto Developer check listener: assigns Developer status instantly if URL contains #dev
function processAutoDeveloperCheck() {
  if (window.location.hash === "#dev") {
    const savedProfile = localStorage.getItem("dreamjr_profile");
    if (savedProfile) {
      profileData = JSON.parse(savedProfile);
    }
    profileData.role = "Developer";
    profileData.username = "Developer Mode";
    profileData.bio = "Creator of Ecosystem Workspace";
    
    localStorage.setItem("dreamjr_profile", JSON.stringify(profileData));
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
    alert("Developer verification detected. Role upgraded to Developer.");
  }
}

// Manual Staff Key input check
function verifyStaffToken() {
  const inputToken = document.getElementById("input-staff-key").value.trim();
  if (inputToken === STAFF_VERIFICATION_TOKEN) {
    profileData.role = "Admin";
    localStorage.setItem("dreamjr_profile", JSON.stringify(profileData));
    updateProfileDisplay();
    document.getElementById("input-staff-key").value = "";
    alert("Staff verification successful. Access level upgraded to Admin.");
  } else {
    alert("Invalid staff verification key.");
  }
}

// Setup local IndexedDB storage
function initIndexedDB() {
  const req = indexedDB.open("DreamJrVaultDB", 1);
  req.onupgradeneeded = (e) => {
    let activeDb = e.target.result;
    if (!activeDb.objectStoreNames.contains("vault")) {
      activeDb.createObjectStore("vault", { keyPath: "id", autoIncrement: true });
    }
  };
  req.onsuccess = (e) => {
    db = e.target.result;
    loadVaultFromSandbox();
  };
  req.onerror = () => {
    console.warn("IndexedDB access denied. Files won't persist.");
  };
}

function updateProfileDisplay() {
  const dispName = document.getElementById("display-name");
  const dispBio = document.getElementById("display-bio");
  const roleText = document.getElementById("role-text");
  const roleTag = document.getElementById("role-tag");

  if (dispName) dispName.innerText = profileData.username;
  if (dispBio) dispBio.innerText = profileData.bio;
  if (roleText) roleText.innerText = profileData.role;
  if (roleTag) {
    roleTag.innerText = profileData.role;
    if (profileData.role === 'Developer') {
      roleTag.className = "bg-red-500/15 border border-red-500/30 text-red-300 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase";
    } else if (profileData.role === 'Admin') {
      roleTag.className = "bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase";
    } else if (profileData.role === 'Member') {
      roleTag.className = "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase";
    } else {
      roleTag.className = "bg-slate-500/15 border border-slate-500/30 text-slate-300 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase";
    }
  }

  const pfpAvatar = document.getElementById("profile-avatar");
  if (pfpAvatar && profileData.avatar) {
    pfpAvatar.src = profileData.avatar;
  }

  const inputUser = document.getElementById("input-username");
  const inputBio = document.getElementById("input-bio");
  const inputPfp = document.getElementById("input-pfp");

  if (inputUser) inputUser.value = profileData.username;
  if (inputBio) inputBio.value = profileData.bio;
  if (inputPfp) inputPfp.value = profileData.avatar;
}

function saveUserProfile() {
  profileData.username = document.getElementById("input-username").value.trim() || "Anonymous";
  profileData.bio = document.getElementById("input-bio").value.trim() || "Exploring the stars...";
  profileData.avatar = document.getElementById("input-pfp").value.trim();

  localStorage.setItem("dreamjr_profile", JSON.stringify(profileData));
  updateProfileDisplay();
}

function generateProfileToken() {
  const payload = {
    n: profileData.username,
    b: profileData.bio,
    r: profileData.role,
    a: profileData.avatar,
    t: profileData.joinTimestamp
  };
  const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  navigator.clipboard.writeText(token);
  alert("Config token generated and copied to clipboard!");
}

function adminLookupProfile() {
  const tokenInput = document.getElementById("admin-search-token").value.trim();
  const output = document.getElementById("admin-inspect-result");
  
  if (!tokenInput) return;
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(tokenInput))));
    output.classList.remove("hidden");
    
    const runtime = decoded.t ? Math.floor((Date.now() - decoded.t) / 1000) : 0;
    const formattedSecs = `${Math.floor(runtime / 3600)}h ${Math.floor((runtime % 3600) / 60)}m`;

    output.innerHTML = `
      <div class="border-b border-emerald-500/20 pb-1 font-bold text-emerald-400">Target Lookup: User Verified</div>
      <div class="flex items-center gap-1.5 my-1">
        <span class="font-semibold text-emerald-100">Username:</span> ${decoded.n || "N/A"}
      </div>
      <div><span class="font-semibold text-emerald-100">Declared Role:</span> ${decoded.r || "N/A"}</div>
      <div><span class="font-semibold text-emerald-100">Declared Bio:</span> ${decoded.b || "N/A"}</div>
      <div><span class="font-semibold text-emerald-100">Session Live Time:</span> ${formattedSecs}</div>
    `;
  } catch (err) {
    output.classList.remove("hidden");
    output.innerHTML = `<span class="text-red-400 font-semibold">Error decoding parameter token</span>`;
  }
}

// Toggle Left Menu
function toggleLeftMenu(type) {
  const panel = document.getElementById("left-sub-panel");
  const backdrop = document.getElementById("overlay-backdrop");
  
  if (activeLeftMenu === type) {
    closeLeftMenu();
    return;
  }

  activeLeftMenu = type;
  closeRightMenu();

  renderLeftPanel(type);

  backdrop.classList.remove("hidden");
  setTimeout(() => backdrop.classList.add("opacity-100"), 10);

  panel.classList.remove("translate-x-[-20px]", "opacity-0", "pointer-events-none");
  panel.classList.add("translate-x-0", "opacity-100", "pointer-events-auto");
  updateActiveButtonStates();
}

function closeLeftMenu() {
  activeLeftMenu = null;
  const panel = document.getElementById("left-sub-panel");
  panel.classList.add("translate-x-[-20px]", "opacity-0", "pointer-events-none");
  panel.classList.remove("translate-x-0", "opacity-100", "pointer-events-auto");
  
  checkDismissBackdrop();
  updateActiveButtonStates();
}

// Toggle Right Menu
function toggleRightMenu(type) {
  const panel = document.getElementById("right-sub-panel");
  const backdrop = document.getElementById("overlay-backdrop");

  if (activeRightMenu === type) {
    closeRightMenu();
    return;
  }

  activeRightMenu = type;
  closeLeftMenu();

  renderRightPanel(type);

  backdrop.classList.remove("hidden");
  setTimeout(() => backdrop.classList.add("opacity-100"), 10);

  panel.classList.remove("translate-x-[20px]", "opacity-0", "pointer-events-none");
  panel.classList.add("translate-x-0", "opacity-100", "pointer-events-auto");
  updateActiveButtonStates();
}

function closeRightMenu() {
  activeRightMenu = null;
  const panel = document.getElementById("right-sub-panel");
  panel.classList.add("translate-x-[20px]", "opacity-0", "pointer-events-none");
  panel.classList.remove("translate-x-0", "opacity-100", "pointer-events-auto");

  checkDismissBackdrop();
  updateActiveButtonStates();
}

function checkDismissBackdrop() {
  const isAnyDetailOpen = ["detail-music", "detail-video", "detail-private", "detail-ai", "detail-social", "detail-profile", "detail-admin"].some(id => {
    return !document.getElementById(id).classList.contains("opacity-0");
  });

  if (!activeLeftMenu && !activeRightMenu && !isAnyDetailOpen) {
    const backdrop = document.getElementById("overlay-backdrop");
    backdrop.classList.remove("opacity-100");
    setTimeout(() => backdrop.classList.add("hidden"), 300);
  }
}

function closeAllMenusAndDetails() {
  closeLeftMenu();
  closeRightMenu();
  closeAllDetails();
}

function updateActiveButtonStates() {
  const list = [
    { id: "btn-left-ai", active: activeLeftMenu === 'ai' },
    { id: "btn-left-video", active: activeLeftMenu === 'video' },
    { id: "btn-left-private", active: activeLeftMenu === 'private' },
    { id: "btn-right-music", active: activeRightMenu === 'music' },
    { id: "btn-right-social", active: activeRightMenu === 'social' },
    { id: "btn-right-profile", active: activeRightMenu === 'profile' }
  ];

  list.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      if (item.active) {
        el.className = "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-emerald-300 glow-capsule transition-all duration-200";
      } else {
        el.className = "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-emerald-500/60 hover:text-emerald-300 transition-all duration-200";
      }
    }
  });
}

function renderLeftPanel(type) {
  const titleEl = document.getElementById("left-panel-title");
  const contentEl = document.getElementById("left-panel-content");

  if (type === 'ai') {
    titleEl.innerHTML = `<i data-lucide="bot" class="w-3.5 h-3.5"></i> Intelligent Hub`;
    contentEl.innerHTML = `
      ${getMenuItemHtml('ai-launch', 'Gemini Chatbot', 'Conversational Assistant', 'sparkles')}
    `;
  } else if (type === 'video') {
    titleEl.innerHTML = `<i data-lucide="clapperboard" class="w-3.5 h-3.5"></i> Video Player`;
    contentEl.innerHTML = `
      ${getMenuItemHtml('video-player', 'Custom Player', 'Stream files or URLs', 'film')}
    `;
  } else if (type === 'private') {
    titleEl.innerHTML = `<i data-lucide="lock" class="w-3.5 h-3.5"></i> Personal Vault`;
    contentEl.innerHTML = `
      ${getMenuItemHtml('vault-launch', 'Media Safe', 'Encrypted local sandbox', 'folder-lock')}
    `;
  }
  lucide.createIcons();
}

function renderRightPanel(type) {
  const titleEl = document.getElementById("right-panel-title");
  const contentEl = document.getElementById("right-panel-content");

  if (type === 'music') {
    titleEl.innerHTML = `Music Console <i data-lucide="music" class="w-3.5 h-3.5"></i>`;
    contentEl.innerHTML = `
      ${getMenuItemHtml('music-player', 'Music Suite 2.0', 'Local tracks & streams', 'music-4')}
    `;
  } else if (type === 'social') {
    titleEl.innerHTML = `Social Media <i data-lucide="share-2" class="w-3.5 h-3.5"></i>`;
    contentEl.innerHTML = `
      ${getMenuItemHtml('social-launch', 'Hook Server', 'Webhook management', 'send')}
    `;
  } else if (type === 'profile') {
    titleEl.innerHTML = `Identity Core <i data-lucide="user" class="w-3.5 h-3.5"></i>`;
    
    let extraOptions = "";
    if (profileData.role === 'Admin' || profileData.role === 'Developer') {
      extraOptions = `${getMenuItemHtml('admin-launch', 'Admin Console', 'Server & telemetry commands', 'shield-alert')}`;
    }

    contentEl.innerHTML = `
      ${getMenuItemHtml('profile-view', 'Personal Identity', 'Edit details & credentials', 'user-cog')}
      ${extraOptions}
    `;
  }
  lucide.createIcons();
}

function getMenuItemHtml(id, label, description, icon) {
  return `
    <button onclick="handleOptionSelect('${id}')" class="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/10 border border-emerald-500/10 text-left hover:bg-emerald-950/20 hover:border-emerald-500/25 transition-all group">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/15 shrink-0">
          <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
        </div>
        <div class="truncate">
          <p class="text-[11px] font-semibold text-emerald-200">${label}</p>
          <p class="text-[9px] text-emerald-500/60 truncate">${description}</p>
        </div>
      </div>
      <i data-lucide="chevron-right" class="w-4 h-4 text-emerald-500/40 shrink-0"></i>
    </button>
  `;
}

function handleOptionSelect(id) {
  closeLeftMenu();
  closeRightMenu();

  const sigContainer = document.getElementById("signature-container");
  sigContainer.classList.add("opacity-0", "scale-90", "pointer-events-none");

  // Reset all details view states
  const detailIds = ["detail-music", "detail-video", "detail-private", "detail-ai", "detail-social", "detail-profile", "detail-admin"];
  detailIds.forEach(targetId => {
    document.getElementById(targetId).classList.add("opacity-0", "scale-95", "pointer-events-none");
  });

  const backdrop = document.getElementById("overlay-backdrop");
  backdrop.classList.remove("hidden");
  backdrop.classList.add("opacity-100");

  setTimeout(() => {
    let activeId = "";
    if (id.startsWith('music-')) activeId = "detail-music";
    else if (id.startsWith('video-')) activeId = "detail-video";
    else if (id.startsWith('vault-')) activeId = "detail-private";
    else if (id.startsWith('ai-')) activeId = "detail-ai";
    else if (id.startsWith('social-')) activeId = "detail-social";
    else if (id.startsWith('profile-')) activeId = "detail-profile";
    else if (id.startsWith('admin-')) activeId = "detail-admin";

    if (activeId) {
      const detail = document.getElementById(activeId);
      detail.classList.remove("opacity-0", "scale-95", "pointer-events-none");
      detail.classList.add("opacity-100", "scale-100", "pointer-events-auto");
    }
  }, 180);
}

function closeAllDetails() {
  const detailIds = ["detail-music", "detail-video", "detail-private", "detail-ai", "detail-social", "detail-profile", "detail-admin"];
  detailIds.forEach(targetId => {
    document.getElementById(targetId).classList.add("opacity-0", "scale-95", "pointer-events-none");
  });

  const sigContainer = document.getElementById("signature-container");
  setTimeout(() => {
    sigContainer.classList.remove("opacity-0", "scale-90", "pointer-events-none");
  }, 150);

  checkDismissBackdrop();
}

// ==========================================
// MODULE: MUSIC PLAYER & ROBUST YT PARSING
// ==========================================
const audioPlayer = document.getElementById("main-audio-player");
let isAudioPlaying = false;

function getYTVideoId(url) {
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/i;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

function loadYTMusic() {
  const url = document.getElementById("yt-music-url").value.trim();
  const videoId = getYTVideoId(url);
  if (!videoId) {
    alert("Please provide a valid YouTube URL");
    return;
  }
  
  audioPlayer.pause();
  isAudioPlaying = false;
  document.getElementById("player-play-btn").innerHTML = `<i data-lucide="play" class="w-4 h-4 ml-0.5"></i>`;
  lucide.createIcons();

  document.getElementById("audio-artwork-box").classList.add("hidden");
  const frameContainer = document.getElementById("yt-player-container");
  frameContainer.classList.remove("hidden");
  frameContainer.innerHTML = `
    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  `;
  document.getElementById("now-playing-title").innerText = "Streaming YouTube audio...";
}

function loadLocalAudio(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("yt-player-container").classList.add("hidden");
  document.getElementById("yt-player-container").innerHTML = "";
  document.getElementById("audio-artwork-box").classList.remove("hidden");

  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  document.getElementById("now-playing-title").innerText = file.name;
  
  audioPlayer.play();
  isAudioPlaying = true;
  document.getElementById("player-play-btn").innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i>`;
  lucide.createIcons();
}

function toggleAudioPlayback() {
  if (!audioPlayer.src) return;
  if (isAudioPlaying) {
    audioPlayer.pause();
    isAudioPlaying = false;
    document.getElementById("player-play-btn").innerHTML = `<i data-lucide="play" class="w-4 h-4 ml-0.5"></i>`;
  } else {
    audioPlayer.play();
    isAudioPlaying = true;
    document.getElementById("player-play-btn").innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i>`;
  }
  lucide.createIcons();
}

function resetPlayer() {
  audioPlayer.currentTime = 0;
}

audioPlayer.addEventListener("timeupdate", () => {
  const cur = Math.floor(audioPlayer.currentTime);
  const mins = Math.floor(cur / 60);
  const secs = String(cur % 60).padStart(2, '0');
  const timerDisplay = document.getElementById("player-time-display");
  if (timerDisplay) {
    timerDisplay.innerText = `${mins}:${secs}`;
  }
});

// ==========================================
// MODULE: VIDEO PLAYER
// ==========================================
function loadVideoFromInput() {
  const url = document.getElementById("video-url-input").value.trim();
  const videoId = getYTVideoId(url);
  const videoEl = document.getElementById("custom-video-element");
  const ytTarget = document.getElementById("yt-video-target");
  const placeholder = document.getElementById("video-placeholder");

  placeholder.classList.add("hidden");

  if (videoId) {
    videoEl.classList.add("hidden");
    videoEl.pause();
    ytTarget.classList.remove("hidden");
    ytTarget.innerHTML = `
      <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    `;
  } else if (url) {
    ytTarget.classList.add("hidden");
    ytTarget.innerHTML = "";
    videoEl.classList.remove("hidden");
    videoEl.src = url;
    videoEl.play();
  }
}

function loadLocalVideo(event) {
  const file = event.target.files[0];
  if (!file) return;

  const videoEl = document.getElementById("custom-video-element");
  const ytTarget = document.getElementById("yt-video-target");
  const placeholder = document.getElementById("video-placeholder");

  placeholder.classList.add("hidden");
  ytTarget.classList.add("hidden");
  ytTarget.innerHTML = "";

  videoEl.classList.remove("hidden");
  videoEl.src = URL.createObjectURL(file);
  videoEl.play();
}

// ==========================================
// MODULE: PERSONAL PRIVATE VAULT (IndexedDB)
// ==========================================
function uploadToVault(event) {
  const file = event.target.files[0];
  if (!file || !db) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const fileData = {
      name: file.name,
      type: file.type,
      dataUrl: e.target.result,
      timestamp: Date.now()
    };
    
    const tx = db.transaction("vault", "readwrite");
    const store = tx.objectStore("vault");
    store.add(fileData);

    tx.oncomplete = () => {
      loadVaultFromSandbox();
    };
  };
  reader.readAsDataURL(file);
}

function loadVaultFromSandbox() {
  if (!db) return;
  const tx = db.transaction("vault", "readonly");
  const store = tx.objectStore("vault");
  const req = store.getAll();

  req.onsuccess = (e) => {
    const mediaList = e.target.result;
    const container = document.getElementById("vault-media-list");
    container.innerHTML = "";

    if (mediaList.length === 0) {
      container.innerHTML = `<div class="text-center text-emerald-500/30 text-[9px] py-8">Your private sandbox is empty</div>`;
      return;
    }

    mediaList.forEach(item => {
      let previewMarkup = "";
      if (item.type.startsWith("image/")) {
        previewMarkup = `<img src="${item.dataUrl}" class="w-full h-24 object-cover rounded-lg border border-emerald-500/10">`;
      } else if (item.type.startsWith("video/")) {
        previewMarkup = `
          <video src="${item.dataUrl}" class="w-full h-24 object-cover rounded-lg border border-emerald-500/10" controls></video>
        `;
      }

      container.innerHTML += `
        <div class="p-2 rounded-xl bg-black/45 border border-emerald-500/10 space-y-1.5 relative group">
          <div class="flex justify-between items-center text-[9px]">
            <span class="text-emerald-400 font-semibold truncate max-w-[150px]">${item.name}</span>
            <button onclick="deleteFromVault(${item.id})" class="text-red-400/70 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          ${previewMarkup}
        </div>
      `;
    });
    lucide.createIcons();
  };
}

function deleteFromVault(id) {
  if (!db) return;
  const tx = db.transaction("vault", "readwrite");
  const store = tx.objectStore("vault");
  store.delete(id);
  tx.oncomplete = () => {
    loadVaultFromSandbox();
  };
}

// ==========================================
// MODULE: SOCIAL MEDIA DISCORD CONNECTIONS
// ==========================================
function sendDiscordWebhook() {
  const webhookUrl = document.getElementById("dc-webhook-url").value.trim();
  const message = document.getElementById("dc-webhook-msg").value.trim();

  if (!webhookUrl || !message) {
    alert("Please fill both Webhook URL and Message content.");
    return;
  }

  localStorage.setItem("dreamjr_webhook", webhookUrl);

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message })
  })
  .then(res => {
    if (res.ok) {
      alert("Message successfully broadcast to Discord!");
      document.getElementById("dc-webhook-msg").value = "";
    } else {
      alert("Failed to send. Verify Discord permissions and Webhook link.");
    }
  })
  .catch(err => {
    console.error(err);
    alert("A network error occurred while connecting to Discord.");
  });
}

function renderDiscordWidget() {
  const serverId = document.getElementById("dc-server-id").value.trim();
  const target = document.getElementById("discord-widget-frame");
  if (!serverId) return;

  target.innerHTML = `
    <iframe src="https://discord.com/widget?id=${serverId}&theme=dark" class="w-full h-full" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
  `;
}

// ==========================================
// MODULE: CHAT ASSISTANT
// ==========================================
function saveApiKey() {
  const key = document.getElementById("gemini-key-input").value.trim();
  localStorage.setItem("gemini_api_key", key);
  alert("API Key updated locally.");
}

function handleChatSubmit(e) {
  if (e.key === "Enter") sendChatMessage();
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  input.value = "";

  const apiKey = localStorage.getItem("gemini_api_key");
  if (!apiKey) {
    appendMessage("Provide your Gemini API Key in the settings panel above.", "system");
    return;
  }

  const tempId = appendMessage("Thinking...", "typing");

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
    });

    const data = await response.json();
    document.getElementById(tempId).remove();

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      appendMessage(data.candidates[0].content.parts[0].text, "bot");
    } else {
      appendMessage("Error parsing context response format.", "system");
    }
  } catch (err) {
    if (document.getElementById(tempId)) {
      document.getElementById(tempId).remove();
    }
    appendMessage("Failed to reach Gemini gateway.", "system");
  }
}

function appendMessage(text, sender) {
  const container = document.getElementById("chat-messages");
  const id = "msg-" + Date.now();
  let markup = "";

  if (sender === "user") {
    markup = `
      <div id="${id}" class="flex gap-1.5 justify-end">
        <div class="bg-emerald-500/20 border border-emerald-500/25 text-emerald-100 rounded-lg p-2 max-w-[85%] leading-relaxed">${text}</div>
      </div>
    `;
  } else if (sender === "bot") {
    markup = `
      <div id="${id}" class="flex gap-1.5">
        <div class="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0"><i data-lucide="bot" class="w-3 h-3"></i></div>
        <div class="bg-emerald-950/20 border border-emerald-500/10 rounded-lg p-2 max-w-[85%] leading-relaxed">${text}</div>
      </div>
    `;
  } else if (sender === "system") {
    markup = `
      <div id="${id}" class="flex gap-1.5">
        <div class="bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg p-2 max-w-[85%] leading-relaxed">${text}</div>
      </div>
    `;
  } else {
    markup = `
      <div id="${id}" class="flex gap-1.5">
        <div class="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0 animate-pulse"><i data-lucide="sparkles" class="w-3 h-3"></i></div>
        <div class="bg-emerald-950/10 border border-emerald-500/10 text-emerald-500/60 rounded-lg p-2 max-w-[85%] leading-relaxed">${text}</div>
      </div>
    `;
  }

  container.innerHTML += markup;
  lucide.createIcons();
  container.scrollTop = container.scrollHeight;
  return id;
}

// ========================================================
// MODULE: DEEP ADMIN CONSOLE (FPS Server Management Style)
// ========================================================
let currentAdminTab = "users";
let mockPlayers = [];

function switchAdminTab(tab) {
  currentAdminTab = tab;
  
  const tabIds = ["users", "metrics", "term"];
  tabIds.forEach(id => {
    document.getElementById(`admin-tab-${id}`).classList.add("hidden");
    document.getElementById(`tab-btn-${id}`).className = "flex-1 text-[8px] font-bold uppercase py-1 rounded text-emerald-500/50";
  });

  document.getElementById(`admin-tab-${tab}`).classList.remove("hidden");
  document.getElementById(`tab-btn-${tab}`).className = "flex-1 text-[8px] font-bold uppercase py-1 rounded bg-emerald-500/25 text-emerald-200";
}

function generateMockPlayers() {
  mockPlayers = [
    { id: 1, name: "Nexus_User_09", role: "Member", ping: 48, device: "Mobile", geo: "🇮🇳", status: "Active" },
    { id: 2, name: "SlayerGuest_9", role: "Guest", ping: 122, device: "Desktop", geo: "🇺🇸", status: "Active" },
    { id: 3, name: "EchoRunner", role: "Member", ping: 72, device: "Mobile", geo: "🇯🇵", status: "Idle" },
    { id: 4, name: "Staff_Ghost", role: "Admin", ping: 22, device: "Desktop", geo: "🇩🇪", status: "Active" }
  ];
  renderMockPlayers();
}

function renderMockPlayers() {
  const container = document.getElementById("admin-users-list");
  if (!container) return;
  container.innerHTML = "";

  container.innerHTML += `
    <div class="flex items-center justify-between p-2 rounded-lg bg-red-950/10 border border-red-500/20 text-left">
      <div>
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-bold text-red-300">★ Developer Mode (Host)</span>
          <span class="text-[7px] bg-red-500/20 text-red-300 px-1 rounded uppercase">Owner</span>
        </div>
        <p class="text-[8px] text-emerald-500/60">Ping: 1ms | Local Device | System Host</p>
      </div>
      <span class="text-[8px] text-red-400 font-bold uppercase tracking-wider pr-1">UNRESTRICTED</span>
    </div>
  `;

  mockPlayers.forEach(p => {
    let statusColor = p.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400';
    container.innerHTML += `
      <div id="player-row-${p.id}" class="flex items-center justify-between p-2 rounded-lg bg-emerald-950/10 border border-emerald-500/10 text-left">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${statusColor}"></span>
            <span class="text-[10px] font-bold text-emerald-200">${p.name} ${p.geo}</span>
            <span class="text-[7px] bg-emerald-500/10 text-emerald-400 px-1 rounded uppercase">${p.role}</span>
          </div>
          <p class="text-[8px] text-emerald-500/60">Ping: ${p.ping}ms | ${p.device} | State: ${p.status}</p>
        </div>
        
        <div class="flex items-center gap-1">
          <button onclick="adminAction('mute', '${p.name}')" class="text-[7px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase">Mute</button>
          <button onclick="adminAction('kick', '${p.name}', ${p.id})" class="text-[7px] font-bold bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded uppercase">Kick</button>
        </div>
      </div>
    `;
  });
}

function adminAction(type, name, id) {
  const termLogs = document.getElementById("terminal-logs");
  if (type === 'kick') {
    mockPlayers = mockPlayers.filter(p => p.id !== id);
    renderMockPlayers();
    if (termLogs) {
      termLogs.innerHTML += `<div class="text-red-400">[CONSOLE] User "${name}" has been kicked from the session context.</div>`;
    }
  } else if (type === 'mute') {
    if (termLogs) {
      termLogs.innerHTML += `<div class="text-amber-400">[CONSOLE] Chat capabilities for "${name}" restricted globally.</div>`;
    }
  }
  if (termLogs) {
    termLogs.scrollTop = termLogs.scrollHeight;
  }
}

function tickServerMetrics() {
  if (currentAdminTab === "metrics") {
    const bandwidth = (Math.random() * 50 + 10).toFixed(1);
    const ping = Math.floor(Math.random() * 20 + 25);
    const mBandwidth = document.getElementById("metric-bandwidth");
    const mPing = document.getElementById("metric-ping");
    if (mBandwidth) mBandwidth.innerText = `${bandwidth} KB/s`;
    if (mPing) mPing.innerText = `${ping} ms`;
  }
}

function handleTerminalSubmit(e) {
  if (e.key === "Enter") {
    const input = document.getElementById("terminal-input");
    const cmd = input.value.trim();
    if (!cmd) return;

    input.value = "";
    const logs = document.getElementById("terminal-logs");
    if (logs) {
      logs.innerHTML += `<div class="text-emerald-500/50">> ${cmd}</div>`;
    }

    const args = cmd.split(" ");
    const primary = args[0].toLowerCase();

    if (primary === "/help") {
      if (logs) {
        logs.innerHTML += `
          <div>- /announce [message] : Broadcast global alert toast</div>
          <div>- /kick [username] : Evict target user</div>
          <div>- /clear : Purge local terminal log history</div>
        `;
      }
    } else if (primary === "/clear") {
      if (logs) logs.innerHTML = `<div>Logs cleared.</div>`;
    } else if (primary === "/announce") {
      const msg = args.slice(1).join(" ");
      if (msg) {
        triggerAnnouncement(msg);
        if (logs) logs.innerHTML += `<div class="text-emerald-300">[BROADCAST] System notification successfully deployed: "${msg}"</div>`;
      } else {
        if (logs) logs.innerHTML += `<div class="text-red-400">Error: Missing notification payload. Syntax: /announce [message]</div>`;
      }
    } else if (primary === "/kick") {
      const target = args[1];
      if (target) {
        const found = mockPlayers.find(p => p.name.toLowerCase() === target.toLowerCase());
        if (found) {
          adminAction('kick', found.name, found.id);
        } else {
          if (logs) logs.innerHTML += `<div class="text-red-400">Error: User "${target}" not detected in database pool.</div>`;
        }
      } else {
        if (logs) logs.innerHTML += `<div class="text-red-400">Error: Missing syntax. Use: /kick [username]</div>`;
      }
    } else {
      if (logs) logs.innerHTML += `<div class="text-red-400">Command not recognized. Type /help to query valid parameters.</div>`;
    }

    if (logs) logs.scrollTop = logs.scrollHeight;
  }
}

function triggerAnnouncement(msg) {
  const banner = document.getElementById("server-announcement-banner");
  const bannerText = document.getElementById("announcement-text");
  if (bannerText) bannerText.innerText = msg;
  if (banner) {
    banner.classList.remove("-translate-y-24", "opacity-0");
    banner.classList.add("translate-y-0", "opacity-100");
  }
}

function dismissAnnouncement() {
  const banner = document.getElementById("server-announcement-banner");
  if (banner) {
    banner.classList.add("-translate-y-24", "opacity-0");
    banner.classList.remove("translate-y-0", "opacity-100");
  }
}

function toggleLockoutSimulator() {
  const maintenanceToggle = document.getElementById("maintenance-toggle");
  const active = maintenanceToggle ? maintenanceToggle.checked : false;
  if (active) {
    alert("Emergency protocol initialized. Regular profiles locked out.");
  }
}
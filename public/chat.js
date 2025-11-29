// ------------------ INITIAL SETUP ------------------

const socket = io(); // auto-connect to same origin

// Screens
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");

// Inputs
const usernameInput = document.getElementById("usernameInput");
const roomInput     = document.getElementById("roomInput");

// Buttons
const loginBtn = document.getElementById("loginBtn");
const sendBtn  = document.getElementById("sendBtn");

// UI Elements
const roomList     = document.getElementById("roomList");
const activeUsers  = document.getElementById("activeUsers");
const messagesDiv  = document.getElementById("messages");
const msgInput     = document.getElementById("msgInput");
const typingStatus = document.getElementById("typingStatus");
const roomTitle    = document.getElementById("roomTitle");

// User state
let username = "";
let roomName = "";


// ------------------ ROOM LIST FROM SERVER ------------------

socket.on("roomList", (rooms) => {
  roomList.innerHTML = "";

  if (rooms.length === 0) {
    const emptyMsg = document.createElement("li");
    emptyMsg.textContent = "No active rooms. Create one!";
    emptyMsg.style.fontStyle = "italic";
    emptyMsg.style.opacity = "0.6";
    emptyMsg.style.cursor = "default";
    emptyMsg.style.borderLeft = "none";
    roomList.appendChild(emptyMsg);
    return;
  }

  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;

    li.onclick = () => {
      roomInput.value = room;  // auto-fill room
    };

    roomList.appendChild(li);
  });
});


// ------------------ JOIN ROOM ------------------

loginBtn.onclick = () => {
  username = usernameInput.value.trim();
  roomName = roomInput.value.trim();

  if (!username || !roomName) {
    alert("Please enter username & room.");
    return;
  }

  // Send join request
  socket.emit("joinRoom", { username, room: roomName });

  // Switch UI
  loginScreen.style.display = "none";
  chatScreen.style.display = "flex";

  roomTitle.innerText = `# ${roomName}`;
};

// Allow Enter key to join
usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") roomInput.focus();
});

roomInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") loginBtn.click();
});


// ------------------ ACTIVE USERS IN ROOM ------------------

socket.on("roomUsers", (users) => {
  activeUsers.innerHTML = "";
  
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    
    // Highlight current user
    if (u === username) {
      li.style.background = "linear-gradient(135deg, #FFD95A 0%, #F5C32C 100%)";
      li.textContent = `${u} (You)`;
    }
    
    activeUsers.appendChild(li);
  });
});


// ------------------ SEND MESSAGE ------------------

function sendMessage() {
  const message = msgInput.value.trim();
  if (!message) return;

  socket.emit("sendMessage", { room: roomName, username, message });
  msgInput.value = "";
  msgInput.focus();
}

sendBtn.onclick = sendMessage;

// Send on Enter
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});


// ------------------ TYPING INDICATOR ------------------

let typingTimeout;

msgInput.addEventListener("input", () => {
  msgInput.style.height = "auto";
  msgInput.style.height = msgInput.scrollHeight + "px";
    
  socket.emit("typing", { username, room: roomName });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { username, room: roomName });
  }, 1000);
});

socket.on("typing", ({ username: typingUser }) => {
  if (typingUser !== username) {
    typingStatus.innerText = `${typingUser} is typing...`;
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingStatus.innerText = "";
    }, 1500);
  }
});


// ------------------ MESSAGE HISTORY ------------------

socket.on("chatHistory", (messages) => {
  messagesDiv.innerHTML = "";

  messages.forEach((msg) => {
    addMessage(msg.username, msg.message, msg.created_at, false);
  });

  scrollToBottom(false); // No smooth scroll for history
});


// ------------------ RECEIVE NEW MESSAGE ------------------

socket.on("receiveMessage", ({ username: u, message, timestamp }) => {
  addMessage(u, message, timestamp || Date.now(), true);
  scrollToBottom(true); // Smooth scroll for new messages
});


// ------------------ RENDER MESSAGE ------------------

function addMessage(sender, text, time, isNew = false) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  // System messages (join/leave notifications)
  if (sender === "Chat") {
    msgDiv.classList.add("system");
    msgDiv.innerHTML = `<p style="margin:0">${text}</p>`;
    messagesDiv.appendChild(msgDiv);
    return;
  }

  // If it's OUR message → special styling
  if (sender === username) {
    msgDiv.classList.add("me");
  }

  // Timestamp (HH:MM)
  const t = new Date(time);
  const ts = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  msgDiv.innerHTML = `
    <strong>${sender}</strong>
    <span class="timestamp">${ts}</span>
    <p>${escapeHtml(text)}</p>
  `;

  messagesDiv.appendChild(msgDiv);
}


// ------------------ SCROLL TO BOTTOM ------------------

function scrollToBottom(smooth = true) {
  if (smooth) {
    messagesDiv.scrollTo({
      top: messagesDiv.scrollHeight,
      behavior: "smooth",
    });
  } else {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}


// ------------------ UTILITY: ESCAPE HTML ------------------

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// ------------------ AUTO-FOCUS INPUT ON LOAD ------------------

window.addEventListener("load", () => {
  usernameInput.focus();
});
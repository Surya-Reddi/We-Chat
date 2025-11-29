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

  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;

    // nice hover UI
    li.style.padding = "8px";
    li.style.borderRadius = "6px";

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
  chatScreen.style.display = "block";

  roomTitle.innerText = `Room: ${roomName}`;
};


// ------------------ ACTIVE USERS IN ROOM ------------------

socket.on("roomUsers", (users) => {
  activeUsers.innerHTML = "";
users.forEach((u) => {
  const li = document.createElement("li");
  li.textContent = u;
  activeUsers.appendChild(li);
});

});


// ------------------ SEND MESSAGE ------------------

sendBtn.onclick = () => {
  const message = msgInput.value.trim();
  if (!message) return;

  socket.emit("sendMessage", { room: roomName, username, message });
  msgInput.value = "";
};


// ------------------ TYPING INDICATOR ------------------

msgInput.addEventListener("input", () => {
  socket.emit("typing", { username, room: roomName });
});

socket.on("typing", ({ username }) => {
  typingStatus.innerText = `${username} is typing...`;

  setTimeout(() => {
    typingStatus.innerText = "";
  }, 800);
});


// ------------------ MESSAGE HISTORY ------------------

socket.on("chatHistory", (messages) => {
  messagesDiv.innerHTML = "";

  messages.forEach((msg) => {
    addMessage(msg.username, msg.message, msg.created_at);
  });

  scrollToBottom();
});


// ------------------ RECEIVE NEW MESSAGE ------------------

socket.on("receiveMessage", ({ username: u, message, timestamp }) => {
  addMessage(u, message, timestamp || Date.now());
  scrollToBottom();
});


// ------------------ RENDER MESSAGE ------------------

function addMessage(sender, text, time) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  // If it's OUR message → special styling
  if (sender === username) {
    msgDiv.classList.add("me");
  }

  // Timestamp (HH:MM)
  const t = new Date(time);
  const ts = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  msgDiv.innerHTML = `
    <strong>${sender}</strong>
    <span style="float:right; font-size:12px; opacity:0.8;">${ts}</span>
    <p style="margin:4px 0 0">${text}</p>
  `;

  messagesDiv.appendChild(msgDiv);
}


// ------------------ SCROLL SMOOTH ------------------

function scrollToBottom() {
  messagesDiv.scrollTo({
    top: messagesDiv.scrollHeight,
    behavior: "smooth",
  });
}

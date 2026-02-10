const WebSocket = require("ws");

const ws = new WebSocket("ws://192.168.0.246:8888");

ws.on("open", () => {
  console.log("✅ ERA ga ulandik");

  // LOGIN
  ws.send(
    JSON.stringify({
      id: "Login1",
      command: "Login",
      data: {
        login: "asnam", // Postman dagidek
        password: "123456", // kassir PIN
      },
    }),
  );
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  console.log("📩 ERA javobi:", msg);

  if (msg.command === "Login" && msg.status === "Success") {
    console.log("🎉 Login muvaffaqiyatli, endi sotuv yuborish mumkin");
  }
});

ws.on("error", (err) => {
  console.error("❌ WS xato:", err.message);
});

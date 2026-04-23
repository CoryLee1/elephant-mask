const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 简单信令：把消息转发给房间里的另一个peer
const rooms = {}; // roomId -> [ws, ws]

wss.on("connection", (ws) => {
  let roomId = null;

  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    if (msg.type === "join") {
      roomId = msg.room;
      if (!rooms[roomId]) rooms[roomId] = [];
      rooms[roomId].push(ws);
      // 通知对方有人加入
      rooms[roomId].forEach(peer => {
        if (peer !== ws && peer.readyState === 1) {
          peer.send(JSON.stringify({ type: "peer-joined" }));
        }
      });
      return;
    }

    // 转发 offer / answer / candidate 给同房间另一个peer
    if (roomId && rooms[roomId]) {
      rooms[roomId].forEach(peer => {
        if (peer !== ws && peer.readyState === 1) {
          peer.send(data.toString());
        }
      });
    }
  });

  ws.on("close", () => {
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(p => p !== ws);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

const PORT = process.env.PORT || 8765;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`推流页面: http://localhost:${PORT}/`);
  console.log(`OBS预览: http://localhost:${PORT}/viewer.html`);
});

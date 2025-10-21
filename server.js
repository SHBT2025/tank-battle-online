const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let bullets = {};
let map = generateMap();

function generateMap() {
  const size = 26;
  let grid = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      if (Math.random() < 0.2) grid[y][x] = 'brick';
      else if (Math.random() < 0.05) grid[y][x] = 'metal';
      else if (Math.random() < 0.1) grid[y][x] = 'water';
      else if (Math.random() < 0.15) grid[y][x] = 'forest';
      else grid[y][x] = null;
    }
  }
  return grid;
}

setInterval(() => {
  map = generateMap();
  io.emit('mapUpdate', map);
}, 60 * 60 * 1000);

io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    const playerId = socket.id;
    players[playerId] = {
      x: Math.random() * 800,
      y: Math.random() * 600,
      name: data.name || 'Player' + Object.keys(players).length
    };
    io.emit('playerUpdate', players);
  });

  socket.on('move', (dir) => {
    if (!players[socket.id]) return;
    const speed = 5;
    switch (dir) {
      case 'left': players[socket.id].x -= speed; break;
      case 'right': players[socket.id].x += speed; break;
      case 'up': players[socket.id].y -= speed; break;
      case 'down': players[socket.id].y += speed; break;
    }
    io.emit('playerUpdate', players);
  });

  socket.on('fire', () => {
    const bulletId = Date.now() + Math.random();
    const player = players[socket.id];
    if (!player) return;
    bullets[bulletId] = {
      x: player.x,
      y: player.y,
      dir: 'right'
    };
    io.emit('bulletUpdate', bullets);
    setTimeout(() => {
      delete bullets[bulletId];
      io.emit('removeBullet', bulletId);
    }, 3000);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('removePlayer', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

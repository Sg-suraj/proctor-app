const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer'); // Requires "npm install peer"

// Create the Peer server
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/' // The server will operate on its own root
});

// Tell Express to use the Peer server at the /peerjs path
app.use('/peerjs', peerServer);

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Handle the specific root route FIRST (fixes redirect bug)
app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// Handle static files AFTER the specific routes
app.use(express.static('public'));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).send());

// When a user visits a room URL, render the EJS template
app.get('/:room', (req, res) => {
    res.render('index', { roomId: req.params.room });
});

// Handle real-time connections (Socket.io)
io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
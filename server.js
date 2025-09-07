const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const { ExpressPeerServer } = require('peer'); // <-- FIX 1: Import PeerServer

// --- Create the Peer server and tell it to use your existing http server ---
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/peerjs' // This is the path the client 'script.js' will connect to
});

// --- Tell Express to use the Peer server at this path ---
app.use('/peerjs', peerServer);

// Set EJS as the template engine
app.set('view engine', 'ejs');

// --- FIX 2: Handle the specific root route FIRST ---
// This fixes the bug where Render would not redirect.
app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// --- Handle static files AFTER the specific routes ---
app.use(express.static('public'));

// Handle favicon requests to prevent errors in the console
app.get('/favicon.ico', (req, res) => res.status(204).send());

// When a user visits a room URL, render the EJS template
app.get('/:room', (req, res) => {
    // Pass the room's ID into the HTML page
    res.render('index', { roomId: req.params.room });
});

// Handle real-time connections (Socket.io)
io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        // Announce to others in the room that a new user has connected
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            // Announce when a user disconnects
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
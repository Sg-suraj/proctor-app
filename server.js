// Import required libraries
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid'); // For creating unique room IDs

// Serve the 'public' folder which contains our frontend files
app.use(express.static('public'));

// When a user goes to the root URL, create a new room and redirect them
app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// For any other URL, serve the main HTML file
app.get('/:room', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Handle real-time communication with Socket.IO
io.on('connection', socket => {
    // This event fires when a user joins a room
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId); // Add the user to the room
        // Announce to everyone else in the room that a new user has connected
        socket.to(roomId).emit('user-connected', userId);

        // This event fires when a user disconnects
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
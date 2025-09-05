const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Serve static files (CSS, frontend JS) from the 'public' folder
app.use(express.static('public'));

// Handle favicon requests to prevent errors in the console
app.get('/favicon.ico', (req, res) => res.status(204).send());

// When a user visits the root, create a new room and redirect them
app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

// When a user visits a room URL, render the EJS template
app.get('/:room', (req, res) => {
    // Pass the room's ID into the HTML page
    res.render('index', { roomId: req.params.room });
});

// Handle real-time connections
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
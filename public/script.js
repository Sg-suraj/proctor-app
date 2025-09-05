// --- 1. SETUP ---
// --- 1. SETUP ---
const socket = io('/');
const myPeer = new Peer();
const peers = {};

const proctorView = document.getElementById('proctor-view');
const examineeView = document.getElementById('examinee-view');
const videoGrid = document.getElementById('video-grid');
const myVideoEl = document.getElementById('my-video');
const quizFrame = document.getElementById('quiz-frame');

// --- 2. DETERMINE USER ROLE ---
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
const ROOM_ID = window.location.pathname.substring(1);

console.log(`This device's role is: ${role || 'Proctor'}`);
console.log(`Joining Room ID: ${ROOM_ID}`);

// --- 3. INITIALIZE PAGE BASED ON ROLE ---
if (role === 'examinee') {
    examineeView.style.display = 'block';
    quizFrame.src = 'https://iamquiz.netlify.app/';

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            console.log("Examinee: Permission granted, camera is on.");
            myVideoEl.srcObject = stream;
            myVideoEl.muted = true;
            myVideoEl.addEventListener('loadedmetadata', () => myVideoEl.play());

            myPeer.on('call', call => {
                console.log("Examinee: Receiving a call from the proctor.");
                call.answer(stream);
            });
        })
        .catch(err => {
            console.error("Examinee: Failed to get local stream", err);
            alert("Camera and microphone access is required to start the exam.");
        });

} else {
    proctorView.style.display = 'flex';
    console.log("Proctor: Waiting for a user to connect.");

    socket.on('user-connected', userId => {
        console.log(`Proctor: Server announced a new user connected with ID: ${userId}`);
        console.log("Proctor: Attempting to call the new user now.");
        setTimeout(() => {
            connectToNewUser(userId);
        }, 1500);
    });
}

// --- 4. SHARED WEBRTC & SOCKET LOGIC ---
myPeer.on('open', id => {
    console.log(`My PeerJS ID is: ${id}`);
    socket.emit('join-room', ROOM_ID, id);
});

socket.on('user-disconnected', userId => {
    console.log(`User with ID ${userId} disconnected.`);
    if (peers[userId]) peers[userId].close();
});

function connectToNewUser(userId) {
    const call = myPeer.call(userId, null);
    const video = document.createElement('video');
    
    console.log(`Proctor: Calling Peer ID ${userId}...`);

    call.on('stream', userVideoStream => {
        console.log(`Proctor: Successfully received stream from ${userId}!`);
        addVideoStream(video, userVideoStream);
    });

    call.on('close', () => {
        console.log(`Proctor: Call with ${userId} was closed.`);
        video.remove();
        videoGrid.innerHTML = '<p>Examinee has disconnected.</p>';
    });

    call.on('error', err => {
        console.error(`Proctor: PeerJS call error with ${userId}:`, err);
    });

    peers[userId] = call;
}

function addVideoStream(video, stream) {
    videoGrid.innerHTML = '';
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}
const socket = io('/'); // Connect to the server's Socket.IO instance
const myPeer = new Peer(); // Create a new Peer connection for WebRTC
const peers = {}; // Object to store connected peers

// Get HTML elements from the page
const proctorView = document.getElementById('proctor-view');
const examineeView = document.getElementById('examinee-view');
const videoGrid = document.getElementById('video-grid');
const myVideoEl = document.getElementById('my-video');
const quizFrame = document.getElementById('quiz-frame');

// --- 2. DETERMINE USER ROLE ---
// Check the URL for a parameter like "?role=examinee"
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');

// Get the unique Room ID from the URL path (e.g., /some-random-id)
const ROOM_ID = window.location.pathname.substring(1);

// --- 3. INITIALIZE PAGE BASED ON ROLE ---

if (role === 'examinee') {
    // This person is taking the quiz.
    examineeView.style.display = 'block'; // Show the examinee view

    // Set the quiz source using your saved link.
    quizFrame.src = 'https://iamquiz.netlify.app/';

    // THIS IS WHERE THE BROWSER ASKS FOR PERMISSION
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            // Permission granted!
            // Show the user's own video in the small preview box.
            myVideoEl.srcObject = stream;
            myVideoEl.muted = true;
            myVideoEl.addEventListener('loadedmetadata', () => myVideoEl.play());

            // When the proctor calls, answer with the stream.
            myPeer.on('call', call => {
                call.answer(stream);
            });
        })
        .catch(err => {
            // Permission denied!
            console.error("Failed to get local stream", err);
            alert("Camera and microphone access is required to start the exam. Please allow access and refresh the page.");
        });

} else {
    // This person is the proctor.
    proctorView.style.display = 'flex'; // Show the proctor view

    // When a new user (the examinee) connects, this event fires.
    socket.on('user-connected', userId => {
        // Wait a moment for the new user's connection to stabilize.
        setTimeout(() => {
            connectToNewUser(userId);
        }, 1500);
    });
}


// --- 4. SHARED WEBRTC & SOCKET LOGIC ---

// When our own peer connection is open, emit the 'join-room' event.
myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

// When a user disconnects, remove their video and close the connection.
socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
});

function connectToNewUser(userId) {
    // The proctor calls the new user. We send 'null' because the proctor isn't sending a video stream.
    const call = myPeer.call(userId, null);
    const video = document.createElement('video');

    // When the examinee's stream is received, add it to the page.
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });

    // When the call is closed (e.g., user leaves), remove the video element.
    call.on('close', () => {
        video.remove();
        videoGrid.innerHTML = '<p>Examinee has disconnected.</p>';
    });

    peers[userId] = call;
}

function addVideoStream(video, stream) {
    // Clear the "Waiting..." message and add the new video element.
    videoGrid.innerHTML = '';
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

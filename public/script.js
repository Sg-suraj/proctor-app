// --- 1. SETUP ---
const socket = io('/');
const peers = {};

const myPeer = new Peer(undefined, {
    host: '0.peerjs.com',
    port: 443,
    path: '/'
});

const proctorView = document.getElementById('proctor-view');
const examineeView = document.getElementById('examinee-view');
const videoGrid = document.getElementById('video-grid');
const myVideoEl = document.getElementById('my-video');
const quizFrame = document.getElementById('quiz-frame');
// ** THIS IS THE FIX **
// Get the Room ID from the hidden div passed by the server
const ROOM_ID = document.getElementById('room-id').innerText;

// --- 2. DETERMINE USER ROLE ---
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
// const ROOM_ID = window.location.pathname.substring(1); // <-- THIS OLD LINE IS REMOVED

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
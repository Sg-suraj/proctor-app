// Wait for the entire HTML page to be loaded and ready
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SETUP ---
    const socket = io('/');
    const peers = {};

    // Configure a reliable PeerJS server connection
    const myPeer = new Peer(undefined, {
        host: '0.peerjs.com',
        port: 443,
        path: '/'
    });

    // Get all necessary HTML elements
    const proctorView = document.getElementById('proctor-view');
    const examineeView = document.getElementById('examinee-view');
    const videoGrid = document.getElementById('video-grid');
    const myVideoEl = document.getElementById('my-video');
    const quizFrame = document.getElementById('quiz-frame');
    const ROOM_ID = document.getElementById('room-id').innerText.trim();

    // --- 2. DETERMINE USER ROLE ---
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');

    // --- 3. INITIALIZE PAGE BASED ON ROLE ---
    if (role === 'examinee') {
        examineeView.style.display = 'block';
        quizFrame.src = 'https://iamquiz.netlify.app/';

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                myVideoEl.srcObject = stream;
                myVideoEl.muted = true;
                myVideoEl.addEventListener('loadedmetadata', () => myVideoEl.play());

                myPeer.on('call', call => {
                    call.answer(stream);
                });
            })
            .catch(err => {
                alert("Camera and microphone access is required to start the exam.");
            });
    } else {
        proctorView.style.display = 'flex';
        socket.on('user-connected', userId => {
            setTimeout(() => connectToNewUser(userId), 1500); // Allow time for connection to stabilize
        });
    }

    // --- 4. SHARED WEBRTC & SOCKET LOGIC ---
    myPeer.on('open', id => {
        socket.emit('join-room', ROOM_ID, id);
    });

    socket.on('user-disconnected', userId => {
        if (peers[userId]) peers[userId].close();
    });

    function connectToNewUser(userId) {
        const call = myPeer.call(userId, null); // Proctor calls without sending a stream
        const video = document.createElement('video');
        
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });

        call.on('close', () => {
            video.remove();
            videoGrid.innerHTML = '<p>Examinee has disconnected.</p>';
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
});
// Wait for the entire HTML page to be loaded and ready
document.addEventListener('DOMContentLoaded', () => {
    
    const socket = io('/');
    const peers = {};

    const myPeer = new Peer(undefined, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
            ]
        }
    });

    // Get all necessary HTML elements
    const proctorView = document.getElementById('proctor-view');
    const examineeView = document.getElementById('examinee-view');
    const videoGrid = document.getElementById('video-grid');
    const myVideoEl = document.getElementById('my-video');
    const quizFrame = document.getElementById('quiz-frame');
    const ROOM_ID = document.getElementById('room-id').innerText.trim();

    // Determine user role from URL
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');

    // Initialize page based on role
    if (role === 'examinee') {
        examineeView.style.display = 'block';
        quizFrame.src = 'https://iamquiz.netlify.app/';

        // 1. First, get the camera/mic stream
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                // 2. Show self-view
                myVideoEl.srcObject = stream;
                myVideoEl.muted = true;
                myVideoEl.addEventListener('loadedmetadata', () => myVideoEl.play());

                // 3. Set up the handler to ANSWER calls
                myPeer.on('call', call => {
                    call.answer(stream);
                });

                // 4. NOW that we are ready to answer, wait for our PeerJS ID 
                //    and THEN join the socket room to announce our presence.
                myPeer.on('open', id => {
                    socket.emit('join-room', ROOM_ID, id);
                });
            })
            .catch(err => {
                alert("Camera and microphone access is required to start the exam.");
            });
    } else {
        // This is the PROCTOR flow
        proctorView.style.display = 'flex';
        
        socket.on('user-connected', userId => {
            // This timeout is still good practice to let the connection stabilize,
            // but the race condition is gone since we know the user is ready.
            setTimeout(() => connectToNewUser(userId), 1000); 
        });

        // The proctor can join immediately.
        myPeer.on('open', id => {
            socket.emit('join-room', ROOM_ID, id);
        });
    }

    // This listener is shared and fine here
    socket.on('user-disconnected', userId => {
        if (peers[userId]) peers[userId].close();
    });

    function connectToNewUser(userId) {
        const call = myPeer.call(userId, null);
        const video = document.createElement('video');
        
        // --- FIX 1: THE AUTOPLAY FIX (STILL REQUIRED) ---
        // Browser will block the video unless it's muted.
        video.muted = true; 
        
        if (!call) {
            console.error('Failed to initiate call with user:', userId);
            return;
        }

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
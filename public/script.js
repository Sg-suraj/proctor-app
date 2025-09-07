// Wait for the entire HTML page to be loaded and ready
document.addEventListener('DOMContentLoaded', () => {
    
    const socket = io('/');
    const peers = {};

    // ===================================================================
    // THE FINAL PEER CONFIGURATION
    // This uses the PUBLIC PeerJS server (reliable) and the
    // NEW secure TURN credentials (also reliable).
    // ===================================================================
    const myPeer = new Peer(undefined, {
        host: '0.peerjs.com',   // <-- Back to the public PeerJS server
        port: 443,
        secure: true,           // <-- Force a secure connection
        path: '/',
        config: {
            'iceServers': [
                // Google's STUN server
                { urls: 'stun:stun.l.google.com:19302' },
                
                // The correct, new OpenRelay TURN configuration
                {
                    urls: 'turn:staticauth.openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayprojectsecret'
                },
                {
                    urls: 'turn:staticauth.openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayprojectsecret'
                },
                {
                    urls: 'turns:staticauth.openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayprojectsecret'
                }
            ]
        }
    });
    // ===================================================================
    // END OF UPDATED BLOCK
    // ===================================================================


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

    // Initialize page based on role (THIS INCLUDES OUR RACE-CONDITION FIX)
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
            // Wait a moment for connections to stabilize
            setTimeout(() => connectToNewUser(userId), 1000); 
        });

        // The proctor can join immediately.
        myPeer.on('open', id => {
            socket.emit('join-room', ROOM_ID, id);
        });
    }

    // This listener is shared
    socket.on('user-disconnected', userId => {
        if (peers[userId]) peers[userId].close();
    });

    function connectToNewUser(userId) {
        const call = myPeer.call(userId, null);
        const video = document.createElement('video');
        
        // This includes our AUTOPLAY FIX
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
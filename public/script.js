document.addEventListener('DOMContentLoaded', () => {
    
    const socket = io('/');
    const peers = {};

    // ===================================================================
    // THE FINAL-FINAL PEER CONFIGURATION
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
    // (The rest of your script.js file stays exactly the same as message #37...)
    const proctorView = document.getElementById('proctor-view');
    const examineeView = document.getElementById('examinee-view');
    // ...etc ...
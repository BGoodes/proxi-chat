import { prompMicrophone, prompCloseDoubleWindow, Rolloff, toFixedNumber, showModal, getCookies, changeVolume } from './utils.js';
import LocalStorageCommunication from './lsc.js';
import Logger from './logger.js';
import SessionManager, { Session } from './sessions.js';
import PeerManager from './peer.js';
import SocketConnection from './socket.js';
import { StreamManager } from './stream.js';

const lsc = new LocalStorageCommunication();
const peer = new PeerManager();
const sessions = new SessionManager();
const socket = new SocketConnection();
const streams = new StreamManager();
let ready = false;
let volumeFactor = 1;

/**
 * @type {MediaStream}
 */
let mediaStream = null;

socket.on('message', (event, data) => {
    if (event !== "in_session") return;
    sessions.update({
        server: data.server,
        player: data.player,
        sid: data.sid,
        type: data.type
    });
});

socket.on('message', (event, data) => {
    if (event !== "out_session") return;
    sessions.remove(data.sid);
});

socket.on('message', (event, data) => {
    if (event !== "you") return;
    ready = true;
    console.log(!sessions.selectedSession, sessions.sessions.size);
    if (!sessions.selectedSession && sessions.sessions.size === 1) {
        Logger.logText('Auto joining session.');
        sessions.emit('select', sessions.sessions.values().next().value);
    }
});

socket.on('message', (event, data) => {
    if (event !== "session_joined") return;
    for (let id of streams.streams.keys())
        streams.close(id);
    sessions.update(data);
    let session = sessions.getSession(data.server.id, data.type, data.player.id);
    sessions.selectedSession = session;
});

socket.on('message', (event, data) => {
    if (event !== "session_left") return;
    for (let id of streams.streams.keys())
        streams.close(id);
    sessions.update(data);
    sessions.selectedSession = null;
});

socket.on('message', (event, data) => {
    if (event !== "player_join") return;
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) return;
    session.updatePlayer({
        id: data.player_id,
        display: data.display,
        avatar: data.avatar
    });
    sessions.render();
});

socket.on('message', (event, data) => {
    if (event !== "player_leave") return;
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) {
        console.log('session not found');
        return;
    }
    session.removePlayer(data.player_id);
    sessions.render();
});

socket.on('message', (event, data) => {
    if (event !== "chatter_joined") return;
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) return;
    session.updatePlayer({
        id: data.player_id,
        peer_id: data.peer_id
    });
    sessions.render();

    if (data.player_id > session.playerId) {
        Logger.logText('You are the initiator.');
        let stream = streams.new(data.peer_id, mediaStream);
        if (!stream) return;
        peer.call(data.peer_id, stream.controlled, {
            metadata: {
                player_id: session.playerId,
                session_id: session.sessionId,
                type: session.type
            }
        });
    }
});

peer.on('close', () => {
    for (let id of streams.streams.keys())
        streams.close(id);
    peer.closePeer();
    sessions.selectedSession = null;
    sessions.render();
});

let connected = false;
let modal = false;
socket.on('connect', async () => {
    connected = true;
    if (modal) {
        modal = false;
        await showModal();
    }
});

socket.on('disconnect', async () => {
    for (let id of streams.streams.keys())
        streams.close(id);
    peer.closePeer();
    sessions.selectedSession = null;
    sessions.render();
    if (!connected) return;
    connected = false;
    await showModal('connection-error');
    modal = true;
});

peer.on('call', (call, incomming) => {
    if (!incomming) return;
    let session = sessions.selectedSession;
    if (!session || session.sessionId !== call.metadata.session_id || session.type !== call.metadata.type) {
        console.log('error to check session');
        return call.close();
    }

    console.log('player', session.players, call.metadata, call.peer);
    var player = session.players.find(p => p.id === call.metadata.player_id && p.peer_id === call.peer);
    if (!player) {
        console.log('error to check player');
        return call.close();
    }
    let stream = streams.new(call.peer, mediaStream);
    if (!stream) {
        console.log('error to create stream');
        return call.close();
    }
    call.answer(stream.controlled);
});

peer.on('call-stream', (call, stream) => {
    console.log('stream', call, stream);
    let session = sessions.selectedSession;
    if (!session || session.sessionId !== call.metadata.session_id || session.type !== call.metadata.type) {
        console.log('error to check session');
        return call.close();
    }
    console.log('player')
    var player = session.players.find(p => p.peer_id === call.peer);
    if (!player) {
        console.log('error to check player');
        return call.close();
    }
    let audio = sessions.getAudioOfPlayer(player.id, session._id);
    session.updatePlayer({
        id: player.id,
        in_call: true
    });
    console.log('audio', audio);
    let player2 = session.players.find(p => p.id === call.metadata.player_id);
    console.log('player2', player2);
    sessions.render();
    audio.srcObject = stream;
    audio.play();
    audio.muted = false;
});

peer.on('call-close', (call) => {
    console.log('call-close', call);
    let session = sessions.selectedSession;
    if (!session || session.sessionId !== call.metadata.session_id || session.type !== call.metadata.type)
        return;
    var player = session.players.find(p => p.peer_id === call.peer);
    if (!player) return;
    session.updatePlayer({
        id: player.id,
        in_call: false
    });
    sessions.render();
});

socket.on('message', (event, data) => {
    if (event !== "chatter_left") return;
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) return;
    let player = session.players.find(p => p.id === data.player_id);
    if (!player) return;
    peer.closeCall(player.peer_id);
    streams.close(player.peer_id);
    session.updatePlayer({
        id: data.player_id,
        peer_id: null
    });
    sessions.render();
});

socket.on('message', (event, data) => {
    if (event !== "player_distance") return;
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) return;
    let player = session.players.find(p => p.id === data.player_id);
    if (!player) return;
    let volume = toFixedNumber(Rolloff(volumeFactor, data.distance, session.minDistance, session.maxDistance), 2);
    changeVolume(streams, player.peer_id, volume, volumeFactor);
});

sessions.on('select', async (session) => {
    if (!session) {
        socket.send('disconnect_session');
        peer.closePeer();
    } else {
        var ps = await peer.newPeer();
        if (!ps) return;
        socket.send('connect_session', {
            type: session.type,
            session_id: session.sessionId,
            player_id: session.playerId,
            peer_id: ps.toString()
        })
    };
});

window.addEventListener('load', async () => {

    Logger.clear();
    Logger.logText('Loading...');
    peer.init();
    sessions.init();

    await prompCloseDoubleWindow(lsc);
    mediaStream = await prompMicrophone();
    if (!mediaStream) {
        await showModal('microphone-required-error');
        return;
    }

    Logger.clear();
    Logger.logText('Audio stream obtained.');

    socket.connect(location.origin, getCookies()['_uid']);

    return;



    let loglist = document.getElementById('loglist');
    let sessionList = document.getElementById('sessionlist');
    let playerlist = document.getElementById('playerlist');
    /**
     * @type {HTMLAudioElement}
     */
    const localAudio = document.getElementById('localaudio');
    localAudio.srcObject = stream;
    console.log('Audio stream obtained.');
    localAudio.muted = true;


    let peerConnections = new Map();
    // setInterval(() => {
    //     peerConnections.forEach((voice, voice_id) => {
    //         var grainvalue = voice.gain.gain.value;
    //         let li = document.querySelector(`li[data-id="${voice.player_id}"][data-session_id="${voice.session_id}"][data-type="${voice.type}"]`);
    //         if (!li) return;
    //         let status = li.getElementsByClassName('status')[0];
    //         if (grainvalue === 0) status.innerText = 'Muted';
    //         else if (grainvalue === 1) status.innerText = 'Full';
    //         else status.innerText = `${toFixedNumber(grainvalue * 100, 2)}%`;
    //     });
    // }, 100);

    // const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    // /**
    //  * 
    //  * @param {any} data 
    //  * @param {MediaStream} steamaudio 
    //  * @returns 
    //  */
    // function createPeerConnection(data, steamaudio) {
    //     let peerConnection = new RTCPeerConnection(config);
    //     let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //     let player = session.players.find(p => p.id === data.player_id);
    //     let _id = data.id || Date.now() + Math.random().toString(36).substring(1);
    //     peerConnection.onicecandidate = (event) => {
    //         if (event.candidate) {
    //             socket.emit('player_ice', {
    //                 ice: event.candidate,
    //                 voice_id: _id,
    //                 session_id: currentSession.id,
    //                 player_id: player.id,
    //                 type: currentSession.type
    //             });
    //         }
    //     };

    //     const context = new AudioContext();
    //     const mediaStreamSource = context.createMediaStreamSource(steamaudio);
    //     const mediaStreamDestination = context.createMediaStreamDestination();
    //     const gainNode = context.createGain();
    //     gainNode.gain.value = 0;

    //     mediaStreamSource.connect(gainNode);
    //     gainNode.connect(mediaStreamDestination);
    //     const controlledStream = mediaStreamDestination.stream;
    //     peerConnection.addStream(controlledStream);

    //     peerConnection.ontrack = (event) => {
    //         /**
    //          * @type {HTMLAudioElement}
    //          */
    //         let audio = document.querySelector(`audio[data-id="${player.id}"][data-session_id="${session.id}"][data-type="${session.type}"]`);
    //         if (!audio) return console.warn('Audio element not found.');
    //         audio.srcObject = event.streams[0];
    //         audio.play();

    //         var contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
    //         var analyseur = contexteAudio.createAnalyser();
    //         let userDiv = document.querySelector(`li[data-id="${player.id}"][data-session_id="${session.id}"][data-type="${session.type}"]`);
    //         var canvas = userDiv.getElementsByClassName('visualizer')[0];
    //         if (!canvas || canvas.classList.contains('hide')) return console.warn('Canvas not found.');
    //         var ctx = canvas.getContext('2d');
    //         var audioSrc = contexteAudio.createMediaElementSource(userDiv.getElementsByClassName('user-audio')[0]);
    //         audioSrc.connect(analyseur);
    //         analyseur.connect(contexteAudio.destination);
    //         analyseur.fftSize = 256;
    //         var bufferLength = analyseur.frequencyBinCount;
    //         var dataArray = new Uint8Array(bufferLength);
    //         var WIDTH = canvas.width;
    //         var HEIGHT = canvas.height;
    //         var barWidth = (WIDTH / bufferLength) * 2.5;
    //         var barHeight;
    //         var x = 0;
    //         function renderFrame() {
    //             requestAnimationFrame(renderFrame);
    //             x = 0;
    //             analyseur.getByteFrequencyData(dataArray);
    //             ctx.fillStyle = "#000";
    //             ctx.fillRect(0, 0, WIDTH, HEIGHT);
    //             for (var i = 0; i < bufferLength; i++) {
    //                 barHeight = dataArray[i];
    //                 var r = barHeight + (25 * (i / bufferLength));
    //                 var g = 250 * (i / bufferLength);
    //                 var b = 50;
    //                 ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    //                 ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
    //                 x += barWidth + 1;
    //             }
    //         }
    //         renderFrame();
    //     };

    //     peerConnections.set(_id, {
    //         _id: _id,
    //         player_id: player.id,
    //         session_id: currentSession.id,
    //         type: currentSession.type,
    //         peer: peerConnection,
    //         gain: gainNode
    //     });

    //     return peerConnections.get(_id);
    // }

    // function removePeerConnection(voice_id) {
    //     if (!peerConnections.has(voice_id)) return;
    //     peerConnections.get(voice_id).peer.close();
    //     peerConnections.delete(voice_id);
    // }

    // function getPeerConnectionFromPlayer(player_id, session_id, type) {
    //     return Array.from(peerConnections.values()).find(v => v.player_id === player_id && v.session_id === session_id && v.type === type);
    // }


    // let playertemplate = (() => {
    //     /**
    //      * @type {HTMLLIElement}
    //      */
    //     let li = document.getElementById('playertemplate');
    //     li.removeAttribute('id');
    //     li.remove();
    //     return li;
    // })();


    // var socket = io({
    //     transports: ["websocket"],
    //     auth: { token: cookie['_uid'] }
    // });

    // socket.on('player_offer', async (data) => {
    //     if (peerConnections.has(data.voice_id))
    //         return console.warn('Voice already exists.');
    //     if (currentSession.id !== data.session_id && currentSession.type !== data.type)
    //         return console.warn('Session mismatch.');
    //     let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //     let player = session.players.find(p => p.id === data.player_id);
    //     if (!player) return console.warn('Player not found.');

    //     let voice = createPeerConnection({
    //         player_id: player.id,
    //         session_id: session.id,
    //         type: session.type,
    //         id: data.voice_id
    //     }, stream);

    //     await voice.peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    //     const answer = await voice.peer.createAnswer({
    //         offerToReceiveAudio: true,
    //         offerToReceiveVideo: false
    //     });
    //     await voice.peer.setLocalDescription(answer);
    //     socket.emit('player_answer', {
    //         answer: answer,
    //         voice_id: voice._id,
    //         player_id: player.id,
    //         session_id: session.id,
    //         type: session.type
    //     });
    // });

    // socket.on('player_answer', async (data) => {
    //     let voice = peerConnections.get(data.voice_id);
    //     if (!voice || voice.player_id !== data.player_id || voice.session_id !== data.session_id || voice.type !== data.type)
    //         return console.warn('Voice not found.');
    //     await voice.peer.setRemoteDescription(new RTCSessionDescription(data.answer));
    // });

    // socket.on('player_ice', async (data) => {
    //     let voice = peerConnections.get(data.voice_id);
    //     if (!voice || voice.player_id !== data.player_id || voice.session_id !== data.session_id || voice.type !== data.type)
    //         return console.warn('Voice not found.');
    //     try {
    //         await voice.peer.addIceCandidate(data.ice);
    //     } catch (error) {
    //         console.error('Error adding received ice candidate', error);
    //     }
    // });
    // socket.on('player_distance', (data) => {
    //     console.log('player_distance', data);
    //     if (currentSession?.id !== data.session_id && currentSession?.type !== data.type) return console.warn('Session mismatch.');
    //     let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //     let player = session.players.find(p => p.id === data.player_id);
    //     if (!player) return console.warn('Player not found.');
    //     let voice = getPeerConnectionFromPlayer(player.id, session.id, session.type);
    //     if (!voice) return console.warn('Voice not found.');
    //     let volume = toFixedNumber(Rolloff(1, data.distance, session.min_distance, session.max_distance), 2);
    //     console.log('volume', volume);
    //     voice.gain.gain.value = volume;
    // })

    // let currentSession = null;
    // let sessions = [];
    // let ready = false;

    // socket.on('connect', onConnect);
    // socket.on('reconnect', onConnect.bind(null, true));
    // socket.on('disconnect', onDisconnect);


    // socket.on('out_session', (data) => {
    //     writeLog(`You are out of session ${data.server.display}.`);
    //     let session = sessions.findIndex(s => s.id === data.server.id);
    //     if (session === -1) return;
    //     sessions.splice(session, 1);
    //     updateSessionList(sessions);
    // });

    // socket.on('chatter_joined', async (data) => {
    //     if (currentSession?.id !== data.session_id && currentSession?.type !== data.type) return;
    //     let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //     let ownplayer = session.players.find(p => p.id === currentSession.player_id);
    //     let player = session.players.find(p => p.id === data.player_id);
    //     if (!player || !ownplayer) return;
    //     writeLog(`${player.display} joined the voice session.`);
    //     if (player.id > ownplayer.id) {
    //         writeLog(`You are the initiator.`);
    //         let voice = createPeerConnection({
    //             player_id: player.id,
    //             session_id: session.id,
    //             type: session.type
    //         }, stream);
    //         let offer = await voice.peer.createOffer({
    //             offerToReceiveAudio: true,
    //             offerToReceiveVideo: false
    //         });
    //         await voice.peer.setLocalDescription(offer);
    //         socket.emit('player_offer', {
    //             offer: offer,
    //             player_id: player.id,
    //             session_id: session.id,
    //             type: session.type,
    //             voice_id: voice._id
    //         });
    //     }
    // });

    // socket.on('chatter_left', (data) => {
    //     if (currentSession?.id !== data.session_id && currentSession?.type !== data.type) return;
    //     let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //     let ownplayer = session.players.find(p => p.id === currentSession.player_id);
    //     let player = session.players.find(p => p.id === data.player_id);
    //     if (!player || !ownplayer) return;
    //     writeLog(`${player.display} left the voice session.`);
    //     let voice = getPeerConnectionFromPlayer(player.id, session.id, session.type);
    //     if (voice) removePeerConnection(voice._id);
    // });

    // socket.on('session_joined', (data) => {
    //     writeLog(`You (${data.player.display}) joined session ${data.server.display}.`);
    //     currentSession = { type: data.type, id: data.server.id, player_id: data.player.id };
    //     let session_index = sessions.findIndex(s => s.id === data.server.id && s.type === data.type);
    //     sessions[session_index] = {
    //         ...sessions[session_index],
    //         player_id: data.player.id,
    //         ...data.server,
    //         type: data.type,
    //         players: data.players
    //     }
    //     updateSessionList(sessions);
    //     updateSession(sessions[session_index]);
    // });

    // function updateSession(session) {
    //     if (!session) {
    //         currentSession = null;
    //         playerlist.innerHTML = '';
    //         return;
    //     }

    //     for (let i = 0; i < playerlist.children.length; i++) {
    //         if (session.players.find(p => p.id === playerlist.children[i].dataset.id)) continue;
    //         playerlist.children[i].remove();
    //     }
    //     session.players.forEach(player => {
    //         /**
    //          * @type {HTMLLIElement}
    //          */
    //         let li = playerlist.querySelector(`li[data-id="${player.id}"][data-session_id="${session.id}"][data-type="${session.type}"]`);
    //         if (!li) {
    //             li = playertemplate.cloneNode(true);
    //             li.dataset.id = player.id;
    //             li.dataset.session_id = session.id;
    //             li.dataset.type = session.type;
    //             playerlist.appendChild(li);

    //             /**
    //              * @type {HTMLAudioElement}
    //              */
    //             const audio = li.getElementsByClassName("user-audio")[0];
    //             audio.dataset.id = player.id;
    //             audio.dataset.session_id = session.id;
    //             audio.dataset.type = session.type;
    //             audio.dataset.player_id = session.player_id;
    //             /**
    //              * @type {HTMLButtonElement}
    //              */
    //             const muteaudio = li.getElementsByClassName("mute-audio")[0];

    //             /**
    //              * @type {HTMLInputElement} range
    //              */
    //             const range = li.getElementsByClassName("volume-range")[0];

    //             muteaudio.addEventListener('click', (e) => {
    //                 audio.muted = !audio.muted;
    //                 if (audio.muted)
    //                     muteaudio.classList.add('muted');
    //                 else muteaudio.classList.remove('muted');
    //             });

    //             audio.addEventListener('volumechange', (e) => {
    //                 if (audio.volume === 0 || audio.muted) muteaudio.classList.add('muted');
    //                 else muteaudio.classList.remove('muted');
    //                 range.value = audio.volume * 100;
    //             });

    //             range.addEventListener('input', (e) => {
    //                 audio.volume = range.value / 100;
    //             });

    //             li.addEventListener('click', (e) => {
    //                 console.log(e.target);
    //                 e.target.classList.toggle('expanded');
    //             });
    //         }

    //         if (player.id === currentSession.player_id && session.id === currentSession.id && session.type === currentSession.type) {
    //             li.classList.add('you');
    //             if (playerlist.children[0] !== li)
    //                 playerlist.insertBefore(li, playerlist.children[0]);
    //         } else li.classList.remove('you');

    //         Array.from(li.getElementsByClassName("display")).map(e => e.innerText = player.display);
    //         Array.from(li.getElementsByClassName("avatar")).map(e => e.src = player.avatar);

    //     });
    // }

    // socket.on('session_left', (data) => {
    //     writeLog(`You (${data.player.display}) leaved session ${data.server.display}.`);
    //     currentSession = null;
    //     updateSessionList(sessions);
    //     updateSession(null);
    // });

    // socket.on('player_join', (data) => {
    //     if (currentSession?.id === data.session_id && currentSession?.type === data.type) {
    //         let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //         if (session) {
    //             writeLog(`Player ${data.display} joined the session.`);
    //             session.players.push({
    //                 id: data.player_id,
    //                 display: data.display,
    //                 avatar: data.avatar
    //             });
    //             updateSession(session);
    //         }
    //     }
    // });

    // socket.on('player_leave', (data) => {
    //     if (currentSession?.id === data.session_id && currentSession?.type === data.type) {
    //         let session = sessions.find(s => s.id === data.session_id && s.type === data.type);
    //         if (session) {
    //             let player = session.players.findIndex(p => p.id === data.player_id);
    //             if (player !== -1) {
    //                 writeLog(`Player ${session.players[player].display} leaved the session.`);
    //                 session.players.splice(player, 1);
    //                 updateSession(session);
    //             }
    //         }
    //     }
    // });


    // updateSession(null);
    // function onConnect(reconnect = false) {
    //     writeLog(`You are ${reconnect ? 'reconnected' : 'connected'} to ProxiChat.`);
    // }

    // function onDisconnect() {
    //     writeLog('You are disconnected from ProxiChat.');
    //     sessions = [];
    //     updateSessionList(sessions);
    //     updateSession(null);
    //     ready = false;
    // }

    // function updateSessionList(sessions) {
    //     for (let i = 0; i < sessionList.children.length; i++) {
    //         if (sessionList.children[i].value === "") continue;
    //         sessionList.removeChild(sessionList.children[sessionList.children.length - 1]);
    //     }
    //     sessions.forEach(session => {
    //         let option = document.createElement('option');
    //         option.innerText = session.display;
    //         option.value = session.type + ':' + session.id;
    //         option.dataset.type = session.type;
    //         option.dataset.id = session.id;
    //         option.dataset.player_id = session.player_id;
    //         option.title = option.value;
    //         option.selected = option.dataset.type === currentSession?.type && option.dataset.id === currentSession?.id && option.dataset.player_id === currentSession?.player_id;
    //         sessionList.appendChild(option);
    //     });
    // }

    // sessionList.addEventListener('change', (e) => {
    //     sessionList.title = e.target.value;
    //     writeLog(`Connecting to the selected session.`);
    //     connectToSession(e.target.value ? {
    //         type: e.target.selectedOptions[0].dataset.type,
    //         id: e.target.selectedOptions[0].dataset.id
    //     } : null);
    //     updateSessionList(sessions);
    // });

    // function connectToSession(select) {
    //     if (!select) {
    //         socket.emit('disconnect_session');
    //         return;
    //     }
    //     let session = sessions.find(s => s.id === select.id && s.type === select.type);
    //     if (!session) {
    //         writeLog('Session not found.');
    //         return;
    //     }
    //     socket.emit('connect_session', { type: session.type, session_id: session.id, player_id: session.player_id });
    // }

    // function writeLog(msg) {
    //     let log = document.createElement('div');
    //     log.classList.add('log');
    //     log.innerText = msg;
    //     loglist.appendChild(log);
    // }
})
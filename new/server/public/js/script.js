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
let isMuted = { mute: false, by: 0 };

function setMute(isActive, by) {
    isMuted = { mute: isActive, by: by };
    Logger.logText(`You are ${isMuted.mute ? 'muted' : 'unmuted'} by ${by === 1 ? 'you' : 'the session'}.`);
    for (let player of sessions.selectedSession.players) {
        let stream = streams.streams.get(player.peer_id);
        if (!stream) continue;
        changeVolume(streams, player.peer_id, stream.volume, isMuted.mute ? 0 : volumeFactor);
    }
    sendSessionData(sessions.selectedSession._id, 'is_mute', isMuted);

    let btn = document.getElementById('mute-button');
    if (btn) {
        if (isMuted.mute) btn.classList.add('active');
        else btn.classList.remove('active');
    }
}


function sendSessionData(session_id, event, data) {
    let session = sessions.sessions.get(session_id);
    if (!session) return;
    socket.send('session_data', {
        session_id: session.sessionId,
        type: session.type,
        event: event,
        data: data
    });
}

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

    // auto join session (update)

    if (ready && !sessions.selectedSession && sessions.sessions.size === 1) {
        Logger.logText('Auto joining session.');
        sessions.emit('select', sessions.sessions.values().next().value);
    }
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

socket.on('message', (event, data) => {
    if (event !== "session_data") return;
    let session = sessions.getSession(data.session_id, data.type, data.player_id);
    if (!session) return console.log('session not found');
    if (data.event === 'set_mute') {
        console.log('set_mute', data.data.mute);
        setMute(data.data.mute, 2);
    } else if (data.event === 'get_mute') {
        sendSessionData(session._id, 'is_mute', { ...isMuted, state: data.data.state });
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
    ready = false;
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
    changeVolume(streams, player.peer_id, volume, isMuted.mute ? 0 : volumeFactor);
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

    window.addEventListener('keydown', (e) => {
        if (e.key === 'm') setMute(!isMuted.mute, 1);
    });

    document.getElementById('mute-button').addEventListener('click', (e) => {
        setMute(!isMuted.mute, 1);
    });

    socket.connect(location.origin, getCookies()['_uid']);

    return;
})
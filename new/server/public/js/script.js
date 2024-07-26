import { prompMicrophone, prompCloseDoubleWindow, Rolloff, toFixedNumber, showModal, getCookies, changeVolume, getMicStream } from './utils.js';
import LocalStorageCommunication from './lsc.js';
import Logger from './logger.js';
import SessionManager, { Session } from './sessions.js';
import PeerManager from './peer.js';
import SocketConnection from './socket.js';
import { StreamManager } from './stream.js';

console.clear();

const lsc = new LocalStorageCommunication();
const peer = new PeerManager();
const sessions = new SessionManager();
const socket = new SocketConnection();
const streams = new StreamManager();
let ready = false;
let inVolume = 1;
let outVolume = 1;
let isMuted = { mute: false, by: 0 };
let isSound = { sound: true, by: 0 };

window.proxichat = {
    lsc,
    peer,
    sessions,
    socket,
    streams,
    ready,
    inVolume,
    isMuted
};

function setMute(isActive, by) {
    isMuted = { mute: isActive, by: by };
    Logger.logText(`You are ${isMuted.mute ? 'muted' : 'unmuted'} by ${by === 1 ? 'you' : 'the session'}.`);
    for (let player of sessions.selectedSession.players) {
        let stream = streams.out_streams.get(player.peer_id);
        if (!stream) {
            console.log('stream not found', player.peer_id);
            continue;
        }
        console.log('setMute', player.peer_id, stream.volume, isMuted.mute ? 0 : inVolume);
        changeVolume(streams, player.peer_id, stream.volume, isMuted.mute ? 0 : inVolume);
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
    sessions.removeSession(data.sid, data.type);
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
    for (let id of streams.out_streams.keys())
        streams.closeOut(id);
    for (let id of streams.in_streams.keys())
        streams.closeIn(id);
    sessions.update(data);
    let session = sessions.getSession(data.server.id, data.type, data.player.id);
    sessions.selectedSession = session;
});

socket.on('message', (event, data) => {
    if (event !== "session_left") return;
    for (let id of streams.out_streams.keys())
        streams.closeOut(id);
    for (let id of streams.in_streams.keys())
        streams.closeIn(id);
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

socket.on('message', async (event, data) => {
    if (event !== "chatter_joined") return;
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) return;
    session.updatePlayer({
        id: data.player_id,
        peer_id: data.peer_id
    });
    sessions.render();

    if (data.player_id > session.playerId) {
        console.log('[ProxiChat] Initiator');
        let ms = await getMicStream();
        if (!ms) return console.log('error to get mic stream');
        let stream = streams.newOut(data.peer_id, ms);
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
    for (let id of streams.out_streams.keys())
        streams.closeOut(id);
    for (let id of streams.in_streams.keys())
        streams.closeIn(id);
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
    for (let id of streams.out_streams.keys())
        streams.closeOut(id);
    for (let id of streams.in_streams.keys())
        streams.closeIn(id);
    peer.closePeer();
    sessions.selectedSession = null;
    sessions.render();
    if (!connected) return;
    connected = false;
    await showModal('connection-error');
    modal = true;

});

peer.on('call', async (call, incomming) => {
    if (!incomming)
        return console.log('[Peer] Call made', call);
    console.log('[Peer] Call received', call);
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
    let ms = await getMicStream();
    if (!ms) {
        console.log('error to get mic stream');
        return call.close();
    }
    let stream = streams.newOut(call.peer, ms);
    if (!stream) {
        console.log('error to create stream');
        return call.close();
    }
    call.answer(stream.controlled);
});

peer.on('call-stream', (call, stream) => {
    console.log('[Peer] Stream received', call, stream);
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
    let sm = streams.newIn(call.peer, `li[data-player_id="${player.id}"][data-session_id="${session._id}"]`, stream);
    let audio = document.querySelector(`li[data-player_id="${player.id}"][data-session_id="${session._id}"] .audio`);
    if (audio) {
        audio.srcObject = sm.original;
        audio.play();
    };
    session.updatePlayer({
        id: player.id,
        in_call: true
    });
    sessions.render();
});

peer.on('call-close', (call) => {
    console.log('[Peer] Call closed', call);
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
    streams.closeOut(player.peer_id);
    session.updatePlayer({
        id: data.player_id,
        peer_id: null
    });
    sessions.render();
});

socket.on('message', (event, data) => {
    if (event !== "player_distance") return;
    console.log('player_distance', data);
    let session = sessions.getSession(data.session_id, data.type);
    if (!session) return;
    let player = session.players.find(p => p.id === data.player_id);
    if (!player) return;
    let volume = toFixedNumber(Rolloff(inVolume, data.distance, session.minDistance, session.maxDistance), 2);
    changeVolume(streams, player.peer_id, volume, isMuted.mute ? 0 : inVolume);
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
    let mediaStream = await prompMicrophone();
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
window.addEventListener('load', () => {
    let loglist = document.getElementById('loglist');
    let sessionList = document.getElementById('sessionlist');
    let playerlist = document.getElementById('playerlist');

    let playertemplate = (() => {
        /**
         * @type {HTMLLIElement}
         */
        let li = document.getElementById('playertemplate');
        li.removeAttribute('id');
        li.remove();
        return li;
    })();

    var cookie = document.cookie.split(';').reduce((res, c) => {
        const [key, val] = c.trim().split('=').map(decodeURIComponent)
        try {
            return Object.assign(res, { [key]: JSON.parse(val) })
        } catch (e) {
            return Object.assign(res, { [key]: val })
        }
    }, {});

    var socket = io({
        transports: ["websocket"],
        auth: { token: cookie['_uid'] }
    });

    let currentSession = null;
    let sessions = [];
    let ready = false;

    socket.on('connect', onConnect);
    socket.on('reconnect', onConnect.bind(null, true));
    socket.on('disconnect', onDisconnect);

    socket.on('in_session', (data) => {
        console.log('in_session', data);
        writeLog(`You are in session ${data.server.display} as ${data.player.display}.`);
        let session = sessions.findIndex(s => s.id === data.server.id);
        if (session === -1) {
            sessions.push({
                ...data.server,
                player_id: data.player.id,
                type: data.type
            });
            if (data.server.id === currentSession?.id && data.type === currentSession?.type) {
                writeLog(`Reconnecting to session ${data.server.display} (player was rejoined).`);
                connectToSession(currentSession);
            } else if (sessions.length === 1 && ready) {
                writeLog(`Automatically connecting to session ${data.server.display} (update).`);
                connectToSession({ type: data.type, id: data.server.id });
            }
        } else sessions[session] = {
            ...sessions[session],
            player_id: data.player.id,
            type: data.type
        };
        updateSessionList(sessions);
    });

    socket.on('out_session', (data) => {
        console.log('out_session', data);
        writeLog(`You are out of session ${data.server.display}.`);
        let session = sessions.findIndex(s => s.id === data.server.id);
        if (session === -1) return;
        sessions.splice(session, 1);
        updateSessionList(sessions);
    });

    socket.on('session_joined', (data) => {
        console.log('session_joined', data);
        writeLog(`You (${data.player.display}) joined session ${data.server.display}.`);
        currentSession = { type: data.type, id: data.server.id };
        let session_index = sessions.findIndex(s => s.id === data.server.id && s.type === data.type);
        sessions[session_index] = {
            ...sessions[session_index],
            player_id: data.player.id,
            ...data.server,
            type: data.type,
            players: data.players
        }
        updateSessionList(sessions);
        updateSession(sessions[session_index]);
    });

    function updateSession(session) {
        // playerlist is ul
        console.log('updateSession', session.players.length);
        for (let i = 0; i < playerlist.children.length; i++) {
            if (session.players.find(p => p.id === playerlist.children[i].dataset.id)) continue;
            console.log('remove', playerlist.children[i]);
            playerlist.children[i].remove();
        }
        session.players.forEach(player => {
            /**
             * @type {HTMLLIElement}
             */
            let li = playerlist.querySelector(`li[data-id="${player.id}"]`);
            if (!li) {
                li = playertemplate.cloneNode(true);
                li.dataset.id = player.id;
                playerlist.appendChild(li);
            }
            Array.from(li.getElementsByClassName("display")).map(e => e.innerText = player.display);
            Array.from(li.getElementsByClassName("avatar")).map(e => e.src = player.avatar);
        });
    }

    socket.on('session_left', (data) => {
        console.log('session_left', data);
        writeLog(`You (${data.player.display}) leaved session ${data.server.display}.`);
        currentSession = null;
        updateSessionList(sessions);
    });

    socket.on('player_join', (data) => {
        console.log('player_join', data);
        if (currentSession?.id === data.server_id && currentSession?.type === data.type) {
            let session = sessions.find(s => s.id === data.server_id && s.type === data.type);
            if (session) {
                writeLog(`Player ${data.display} joined the session.`);
                session.players.push({
                    id: data.player_id,
                    display: data.display,
                    avatar: data.avatar
                });
                updateSession(session);
            }
        }
    });

    socket.on('player_leave', (data) => {
        console.log('player_leave', data);
        if (currentSession?.id === data.server_id && currentSession?.type === data.type) {
            let session = sessions.find(s => s.id === data.server_id && s.type === data.type);
            if (session) {
                let player = session.players.findIndex(p => p.id === data.player_id);
                if (player !== -1) {
                    writeLog(`Player ${session.players[player].display} leaved the session.`);
                    session.players.splice(player, 1);
                    updateSession(session);
                }
            }
        }
    });

    socket.on('you', (data) => {
        console.log('you', data);
        if (currentSession) {
            let session = sessions.find(s => s.id === currentSession.id && s.type === currentSession.type);
            if (session) {
                writeLog(`Automatically reconnecting to session ${session.display}.`);
                connectToSession({ type: session.type, id: session.id });
            }
        } else if (sessions.length === 1) {
            writeLog(`Automatically connecting to session ${sessions[0].display} (init).`);
            connectToSession({ type: sessions[0].type, id: sessions[0].id });
        }
        ready = true;
    });

    function onConnect(reconnect = false) {
        writeLog(`You are ${reconnect ? 'reconnected' : 'connected'} to ProxiChat.`);
    }

    function onDisconnect() {
        writeLog('You are disconnected from ProxiChat.');
        sessions = [];
        updateSessionList(sessions);
        ready = false;
    }

    function updateSessionList(sessions) {
        for (let i = 0; i < sessionList.children.length; i++) {
            if (sessionList.children[i].value === "") continue;
            sessionList.removeChild(sessionList.children[sessionList.children.length - 1]);
        }
        sessions.forEach(session => {
            let option = document.createElement('option');
            option.innerText = session.display;
            option.value = session.type + ':' + session.id;
            option.dataset.type = session.type;
            option.dataset.id = session.id;
            option.title = option.value;
            option.selected = option.dataset.type === currentSession?.type && option.dataset.id === currentSession?.id;
            sessionList.appendChild(option);
        });
    }

    sessionList.addEventListener('change', (e) => {
        sessionList.title = e.target.value;
        writeLog(`Connecting to the selected session.`);
        connectToSession(e.target.value ? {
            type: e.target.selectedOptions[0].dataset.type,
            id: e.target.selectedOptions[0].dataset.id
        } : null);
        updateSessionList(sessions);
    });

    function connectToSession(select) {
        if (!select) {
            socket.emit('disconnect_session');
            return;
        }
        let session = sessions.find(s => s.id === select.id && s.type === select.type);
        if (!session) {
            writeLog('Session not found.');
            return;
        }
        socket.emit('connect_session', { type: session.type, session_id: session.id, player_id: session.player_id });
    }

    function writeLog(msg) {
        let log = document.createElement('div');
        log.classList.add('log');
        log.innerText = msg;
        loglist.appendChild(log);
    }
})
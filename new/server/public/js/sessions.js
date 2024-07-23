import EventEmitter from "./event.js";

const templateUser = `<li class="user-element">
<div class="infos btn">
  <canvas class="visualizer"></canvas>
  <div class="usericon">
    <img class="avatar">
    <div class="username">
      <h5 class="display"></h5>
    </div>
  </div>
  <div class="status">
    <i class="offline-icon icon bi bi-dash-square" title="Offline"></i>
    <i class="call-icon icon bi bi-telephone-x-fill" title="Not in Call"></i>
    <i class="me-icon icon bi bi-person-fill" title="Me"></i>
  </div>
</div>
<div class="options">
  <audio class="audio"></audio>
  <div class="volume">
    <input type="range" class="volume-range" min="0" max="100" value="100">
    <button class="btn muted">
      <i class="bi bi-volume-mute-fill"></i>
    </button>
  </div>
</div>
</li>`;
const templateSession = `<li class="session-element"><a class="dropdown-item display">Action two</a></li>`;


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


function setupAudioVisualizer(canvas, audio) {
  var contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
  var analyseur = contexteAudio.createAnalyser();
  var ctx = canvas.getContext('2d');
  var audioSrc = contexteAudio.createMediaElementSource(audio);
  audioSrc.connect(analyseur);
  analyseur.connect(contexteAudio.destination);
  analyseur.fftSize = 256;
  var bufferLength = analyseur.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);
  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;
  var barWidth = (WIDTH / bufferLength) * 2.5;
  var barHeight;
  var x = 0;
  function renderFrame() {
    x = 0;
    analyseur.getByteFrequencyData(dataArray);

    // clear with transparent
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (var i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];
      ctx.fillStyle = "#0000001a";
      ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  return renderFrame;
}


export default class SessionManager extends EventEmitter {
  get nodeTitle() {
    return document.querySelector('#session-title');
  }

  get nodeUserList() {
    return document.querySelector('#user-list');
  }

  get nodeSessionList() {
    return document.querySelector('#session-list');
  }

  get nodeSessionTitle() {
    return document.querySelector('#session-list-title');
  }

  getAudioOfPlayer(player_id, session_id) {
    return this.nodeUserList.querySelector(`li[data-session_id="${session_id}"][data-player_id="${player_id}"] .audio`);
  }

  /**
   * @type {Map<string, Session>}
   */
  sessions = null;

  selectSessionId = null;
  runtimeframe = [];

  get selectedSession() {
    return this.selectSessionId && this.sessions.get(this.selectSessionId);
  }

  set selectedSession(value) {
    this.selectSessionId = value ? value._id : null;
    this.render();
  }

  constructor() {
    super();
  }

  init() {
    this.sessions = new Map();
    this.clear();
    this.runningFrame();
  }

  runningFrame() {
    for (let rf of this.runtimeframe) rf.rf();
    requestAnimationFrame(() => this.runningFrame());
  }

  clear() {
    this.sessions.clear();
    this.render();
  }

  update(data) {
    let session = data instanceof Session ? data : this.getSession(data.server.id, data.type, data.player.id);
    if (!session) {
      session = new Session(data);
      this.sessions.set(session._id, session);
    } else session.update(data);
    this.render();
    return session;
  }

  render() {
    for (let node of this.nodeSessionList.children) {
      let session = this.getSession(node.dataset.id, node.dataset.type, node.dataset.player);
      if (!session && !node.classList.contains('persitant')) node.remove();
    }

    for (let [key, session] of this.sessions) {
      let node = this.nodeUserList.querySelector(`li[data-id="${key}"]`);
      if (!node) {
        let div = document.createElement('div');
        div.innerHTML = templateSession;
        node = div.firstChild;
        node.dataset.id = key;
        node.addEventListener('click', () => this._onSelectSession(key));
        this.nodeSessionList.insertBefore(node, this.nodeSessionList.querySelector('.disconnect'));
      }
      let display = node.querySelector('.display');
      display.textContent = session.sessionDisplay;
      display.title = session.sessionId;
    }

    let selected = this.selectedSession;
    if (selected) {
      this.nodeSessionTitle.textContent = 'Connecté';
      this.nodeTitle.textContent = selected.sessionDisplay;
      this.nodeTitle.title = selected.sessionId;
      let dis = this.nodeSessionList.querySelector(`li.disconnect`);
      dis.classList.remove('hide');
      dis.onclick = null;
      dis.onclick = () => this._onSelectSession(null);

      for (let node of this.nodeUserList.children) {
        let player = selected.players.find(p => p.id === node.dataset.player_id && selected._id === node.dataset.session_id);
        if (!player) {
          node.remove();
          let index = this.runtimeframe.findIndex(rf => rf.player_id === node.dataset.player_id && rf.session_id === node.dataset.session_id);
          if (index >= 0) this.runtimeframe.splice(index, 1);
        }
      }

      let sortedplayer = selected.players.sort((a, b) => {
        if (a.id === selected.playerId) return -1;
        if (b.id === selected.playerId) return 1;
        if (a.peer_id && !b.peer_id) return -1;
        if (!a.peer_id && b.peer_id) return 1;
        return a.display.localeCompare(b.display) || a.id.localeCompare(b.id);
      });

      for (let player of sortedplayer) {
        let node = this.nodeUserList.querySelector(`li[data-session_id="${selected._id}"][data-player_id="${player.id}"]`);
        if (!node) {
          let div = document.createElement('div');
          div.innerHTML = templateUser;
          node = div.firstChild;
          node.dataset.session_id = selected._id;
          node.dataset.player_id = player.id;
          if (player.id === selected.playerId) node.classList.add('me');
          node.querySelector('.infos').addEventListener('click', () => node.classList.toggle('expanded'));
          this.nodeUserList.appendChild(node);
          let rf = setupAudioVisualizer(node.querySelector('.visualizer'), node.querySelector('.audio'));
          this.runtimeframe.push({ rf, player_id: player.id, session_id: selected._id });
        }
        let display = node.querySelector('.display');
        display.textContent = player.display;
        display.title = player.id;
        let avatar = node.querySelector('.avatar');
        avatar.src = player.avatar;
        let status = node.querySelector('.status');
        if (player.peer_id && status.classList.contains('offline')) status.classList.remove('offline');
        else if (!player.peer_id) status.classList.add('offline');
        if (!player.in_call && player.peer_id && !status.classList.contains('call') && player.id !== selected.playerId) status.classList.add('call');
        else if (player.in_call || !player.peer_id) status.classList.remove('call');
        if (player.id === selected.playerId && !status.classList.contains('me')) status.classList.add('me');
        else status.classList.remove('me');
      }
    } else {
      this.nodeUserList.innerHTML = '';
      this.nodeTitle.textContent = ``;
      this.nodeSessionTitle.textContent = 'Non connecté';
      this.nodeSessionTitle.title = '';
      this.nodeSessionList.querySelector(`li.disconnect`).classList.add('hide');
      for (let node of this.nodeUserList.children) node.remove();
    }
  }

  _onSelectSession(id) {
    let session = this.sessions.get(id);
    this.emit('select', session);
  }

  /**
   * @param {string} session_id 
   * @param {string} type 
   * @param {string | undefined} player_id 
   * @returns 
   */
  getSession(session_id, type, player_id) {
    for (let [key, session] of this.sessions)
      if (session.sessionId === session_id && session.type === type && (!player_id || session.playerId === player_id))
        return session;
    return null;
  }
}

export class Session {

  _rawData = {};
  _id = null;

  /**
   * Type of the session ("minecraft" for example)
   * @type {string}
   */
  get type() {
    return this._rawData.type;
  }

  /**
   * Display of the session
   * @type {string}
   */
  get sessionDisplay() {
    return this._rawData.server.display;
  }

  /**
   * Global session ID
   * @type {string}
   */
  get sessionId() {
    return this._rawData.server.id;
  }

  /**
   * Session ID
   * @type {string}
   */
  get playerId() {
    return this._rawData.player.id;
  }

  get players() {
    return this._rawData.players || [];
  }

  get maxDistance() {
    return this._rawData.server.max_distance || 0;
  }

  get minDistance() {
    return this._rawData.server.min_distance || 0;
  }


  updatePlayer(value) {
    let player = this.players.find(p => p.id === value.id);
    if (!player) {
      this.players.push({
        id: value.id,
        display: value.display,
        avatar: value.avatar,
        peer_id: value.peer_id,
        in_call: value.in_call
      });
    } else {
      player.id = value.id === undefined ? player.id : value.id;
      player.display = value.display === undefined ? player.display : value.display;
      player.avatar = value.avatar === undefined ? player.avatar : value.avatar;
      player.peer_id = value.peer_id === undefined ? player.peer_id : value.peer_id;
      player.in_call = value.in_call === undefined ? player.in_call : value.in_call;
    }
    return this;
  }

  removePlayer(id) {
    let index = this.players.findIndex(p => p.id === id);
    if (index >= 0) this.players.splice(index, 1);
    return this;
  }

  constructor(data) {
    this._id = Math.random().toString(36).substring(2, 9);
    this.update(data);
  }

  update(data) {
    this._rawData = data;
    return this;
  }
}
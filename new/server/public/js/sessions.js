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
    <button class="btn button-mute">
      <i class="bi bi-volume-mute-fill"></i>
    </button>
  </div>
</div>
</li>`;
const templateSession = `<li class="session-element"><a class="dropdown-item display">Action two</a></li>`;

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
  /**
   * @type {Map<string, Session>}
   */
  sessions = null;

  selectSessionId = null;

  /**
   * @type {Session | null}
   */
  get selectedSession() {
    return this.selectSessionId && this.sessions.get(this.selectSessionId) || null;
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
        if (!player) node.remove();

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

        let audio = node.querySelector('.audio');
        let volume = node.querySelector('.volume-range');
        let muted = node.querySelector('.button-mute');

        volume.addEventListener('input', () => {
          audio.volume = volume.value / 100;
          if (volume.value === '0') {
            muted.classList.add('muted');
            audio.muted = true;
          }
          else {
            muted.classList.remove('muted');
            audio.muted = false;
          }
        });

        muted.addEventListener('click', () => {
          if (audio.volume === 0) {
            audio.volume = volume.value / 100;
            if (volume.value !== '0') {
              muted.classList.remove('muted');
              audio.muted = false;
            }
          } else {
            audio.volume = 0;
            muted.classList.add('muted');
            audio.muted = true;
          }
        });



        if (volume.value !== '0') {
          audio.volume = volume.value / 100;
          audio.muted = false;
          muted.classList.remove('muted');
        } else {
          audio.volume = 0;
          audio.muted = true;
          muted.classList.add('muted');
        }

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


  removeSession(id, type) {
    let session = this.getSession(id, type);
    if (session) this.sessions.delete(session._id);
    this.render();
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

  /**
   * @type {Array<{id: string, display: string, avatar: string, peer_id: string, in_call: boolean}>}
   * @readonly
   */
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
const template = `<li class="user-element expanded">
<div class="infos btn">
  <div class="usericon">
    <img class="avatar" src="https://s.namemc.com/2d/skin/face.png?id=12b92a9206470fe2&scale=4">
    <div class="username">
      <h5 class="display">Display</h5>
    </div>
  </div>
  <div class="status"></div>
</div>
<div class="options">
  <audio class="user-audio"></audio>
  <div class="volume">
    <input type="range" class="volume-range" min="0" max="100" value="100">
    <button class="btn muted">
      <i class="bi bi-volume-mute-fill"></i>
    </button>
  </div>
  <canvas class="visualizer w-100 hide"></canvas>
</div>
</li>`

export default class SessionManager {
    static get nodeTitle() {
        return document.querySelector('#session-title');
    }

    static get nodeUserList() {
        return document.querySelector('#user-list');
    }

    static clear() {
        this.nodeTitle.innerText = '';
    }
}

export class Session {

}
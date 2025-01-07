export const htmlTemplate = `
      <style>
      #youtube-container {
        position: sticky;
        top: 0;
        display: flex;
        align-items: flex-start;
      }
      .menu-container {
        position: relative;
      }
      #menu-button {
        background: none;
        border: none;
        font-size: 24px;
        padding: 10px;
        cursor: pointer;
        margin-left: 10px;
      }
      .menu-content {
        display: none;
        position: absolute;
        right: 0;
        background-color: white;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        z-index: 1;
        border-radius: 4px;
      }
      .menu-container:hover .menu-content {
        display: block;
      }
      .menu-content button {
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
      }
      .menu-content button:hover {
        background-color: #f1f1f1;
      }
      .shortcut-item {
        padding: 12px 16px;
        color: #666;
        font-size: 0.9em;
        border-top: 1px solid #eee;
      }
      .shortcut-key {
        font-weight: bold;
        color: #333;
      }
      </style>
      <ephemeral-banner></ephemeral-banner>
      <div id='youtube-container'>
        <youtube-player-ui></youtube-player-ui>
        <div class="menu-container">
          <div class="menu-content">
            <button id='add-youtube-btn'>Add youtube video</button>
          </div>
          <div class="shortcut-item">
          Keyboard shortcuts
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">space</span>: play/pause
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">↑, enter</span>: next point
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">f</span>: toggle fullscreen
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">z, x</span>: slow-mo
          </div>
        </div>
      </div>
      <div><sheet-ui></sheet-ui></div>
    `;

// TODO add this back
// <button id='menu-button'>☰ Menu</button>

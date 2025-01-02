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
      </style>
      <ephemeral-banner></ephemeral-banner>
      <div id='youtube-container'>
        <youtube-player-ui></youtube-player-ui>
        <div class="menu-container">
          <button id='menu-button'>☰ Menu</button>
          <div class="menu-content">
            <button id='add-youtube-btn'>Add youtube video</button>
          </div>
        </div>
      </div>
      <div><match-sheet-ui></match-sheet-ui></div>
    `;

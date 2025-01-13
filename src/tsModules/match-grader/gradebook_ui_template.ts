export const htmlTemplate = `
      <style>
      #youtube-container {
        position: sticky;
        top: 0;
        display: flex;
        align-items: flex-start;
      }
      </style>
      <ephemeral-banner></ephemeral-banner>
      <div id='youtube-container'>
        <youtube-player-ui></youtube-player-ui>
        <stat-ui></stat-ui>
      </div>
      <div><sheet-ui></sheet-ui></div>
    `;

// TODO add this back
// <button id='menu-button'>☰ Menu</button>
// <div class="menu-content">
//   <div class="shortcut-item">
//   Keyboard shortcuts
//   </div>
//   <div class="shortcut-item">
//     <span class="shortcut-key">space</span>: play/pause
//   </div>
//   <div class="shortcut-item">
//     <span class="shortcut-key">↑, enter</span>: next point
//   </div>
//   <div class="shortcut-item">
//     <span class="shortcut-key">f</span>: toggle fullscreen
//   </div>
//   <div class="shortcut-item">
//     <span class="shortcut-key">z, x</span>: slow-mo
//   </div>
// </div>

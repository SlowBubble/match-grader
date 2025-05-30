
/**
 * Usage:
    import * as banner from './banner.js';
    const eBanner = banner.setup();
 */

export function setup() {
  const eBanner = new EphemeralBanner();
  document.body.appendChild(eBanner);
  return eBanner;
}

const html = `
<style>
#banner {
  position: fixed;
  left: 50%;

  border-style: solid;
  border-width: 1px;
  padding: 6px;
  font-size: 30px;
  z-index:100;

  visibility: hidden;
}
</style>
<div id='banner'>
</div>
`;

export class EphemeralBanner extends HTMLElement {
  private root: any;
  private banner: any;
  private timeout: any;
  constructor() {
    super();
  }

  connectedCallback() {
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = html;
  }

  _display(message = '', bottom = false) {
    if (!this.banner) {
      this.banner = this.root.querySelector('#banner');
      if (!this.banner) {
        return;
      }
    }
    if (bottom) {
      this.banner.style.bottom = 0;
      this.banner.style.top = '';
    } else {
      this.banner.style.top = 0;
      this.banner.style.bottom = '';
    }

    const numWords = message.split(' ').length;
    const wordsPerSec = 1.5;
    const baseSec = 2;
    const milliSecPerSec = 1000;
    window.clearTimeout(this.timeout);
    this.banner.innerHTML = message.split('\n').join('<br>');
    this.banner.style.visibility = 'visible';
    this.timeout = window.setTimeout(() => {
      this.banner.style.visibility = 'hidden';
    }, (baseSec + numWords / wordsPerSec) * milliSecPerSec);
  }

  failure(message = '', bottom = false) {
    this._display(message,bottom);
    this.banner.style.backgroundColor = 'hsl(0,100%,90%)';
    this.banner.style.borderColor = 'hsl(0,80%,70%)';
  }

  inProgress(message = '', bottom = false) {
    this._display(message,bottom);
    this.banner.style.backgroundColor = 'hsl(49.2,100%,90%)';
    this.banner.style.borderColor = 'hsl(39.39,80%,70%)';
  }

  success(message = '', bottom = false) {
    this._display(message,bottom);
    this.banner.style.backgroundColor = 'hsl(100,100%,90%)';
    this.banner.style.borderColor = 'hsl(120,80%,70%)';
  }

  hint(message = '', bottom = false) {
    this._display(message,bottom);
    this.banner.style.backgroundColor = 'white';
    this.banner.style.borderColor = '#888888';
  }
}

customElements.define('ephemeral-banner', EphemeralBanner);

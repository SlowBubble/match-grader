declare namespace YT {
  enum PlayerState {
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3
  }
}

const iframeId = 'youtube-iframe';

export class YoutubePlayerUi extends HTMLElement {
  public youtubePlayer: any;
  public onEndCallback?: () => void;

  connectedCallback() {
    this.innerHTML = `
      <div id='iframe-container'>
        Please add a video
      </div>
    `;

    // Must inject script like this for it to execute properly
    const detectIframeApiLoadedScript = document.createElement('script');
    detectIframeApiLoadedScript.innerHTML = `
      window.youtubeIframApiReady = false;
      function onYouTubeIframeAPIReady() {
        console.log('onYouTubeIframeAPIReady called');
        window.youtubeIframApiReady = true;
      }
    `;
    const iframeApiScript = document.createElement('script');
    iframeApiScript.src = 'https://www.youtube.com/iframe_api';
    this.appendChild(detectIframeApiLoadedScript);
    this.appendChild(iframeApiScript);
  }

  // Must call this to load the actual video.
  async initYoutubePlayer(videoId: string, autoplay = false) {
    const {width, height} = getWindowSize();
    const minTableHeight = 150;
    let maxPlayerHeight = height - minTableHeight;
    let maxPlayerWidth = maxPlayerHeight * 16 / 9;
    if (maxPlayerHeight * 16 / 9 > width) {
      maxPlayerWidth = width;
      maxPlayerHeight = maxPlayerWidth * 9 / 16;
    }

    // Avoid showing the thumbnail (which may contain the spoiler)
    // rel=0 tries to remove related video (not working for pause)
    this.querySelector('#iframe-container')!.innerHTML = `
      <iframe id="${iframeId}"
        width="0" height="0"
        src="https://www.youtube.com/embed/${videoId}?rel=0&controls=0&enablejsapi=1"
        allow="autoplay"></iframe>
      <iframe id='fake-iframe' width='${maxPlayerWidth}' height='${maxPlayerHeight}' style='background:black;'></iframe>
    `;
    if (await isYoutubeIframApiReady()) {
      this.youtubePlayer = await createYoutubePlayer(iframeId, this);
      this.youtubePlayer.seekTo(0.1);
      this.youtubePlayer.mute();
      this.youtubePlayer.playVideo();
      window.setTimeout(() => {
        this.youtubePlayer.unMute();
        if (!autoplay) {
          this.youtubePlayer.pauseVideo();
        }
        (this.querySelector('#fake-iframe') as HTMLIFrameElement).style.display = 'none';
        this.setIframeDims(maxPlayerWidth);
      }, 900);
    }
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  setIframeDims(width: number) {
    const height = Math.round(width * 9 / 16);
    this.youtubePlayer.setSize(width, height);
  }
  getIframeWidth() {
    const iframe = this.querySelector(`#${iframeId}`) as HTMLIFrameElement;
    return parseInt(iframe.width);
  }

  toggleVideoPlay() {
    const state = this.youtubePlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
      this.youtubePlayer.pauseVideo();
    } else {
      this.youtubePlayer.playVideo();
    }
  }

  move(amountSec = 0) {
    this.youtubePlayer.seekTo(amountSec + this.youtubePlayer.getCurrentTime());
  }
  moveTo(ms = 0) {
    this.youtubePlayer.seekTo(ms / 1000);
  }
  incrementPlaybackRate(amount = 0.2) {
    let want = this.youtubePlayer.getPlaybackRate() + amount;
    if (want <= 0) {
      want = 0.1;
    }
    this.youtubePlayer.setPlaybackRate(want);
  }
  resetPlaybackRate() {
    this.youtubePlayer.setPlaybackRate(1);
  }
}

async function createYoutubePlayer(iframeId: string, element: YoutubePlayerUi) {
  const ready = await isYoutubeIframApiReady();
  if (!ready) {
    console.log('error: isYoutubeIframApiReady is false.');
  }
  return new Promise((resolve) => {
    // @ts-ignore: Defined in https://www.youtube.com/iframe_api
    const player = new window.YT.Player(iframeId, {
        events: {
          'onReady': () => {
            resolve(player);
          },
          'onStateChange': (evt: any) => {
            if (evt.data === YT.PlayerState.ENDED && element.onEndCallback) {
              element.onEndCallback();
            }
          },
        }
    });
  });
}

async function isYoutubeIframApiReady() {
  return new Promise(resolve => {
    const intervalId = window.setInterval(() => {
      console.log('polling youtubeIframApiReady');
      // @ts-ignore: Defined in https://www.youtube.com/iframe_api
      if (window.youtubeIframApiReady) {
        clearInterval(intervalId);
        resolve(true);
      }
    }, 200);
  });
}

function getWindowSize() {
  const { innerWidth, innerHeight } = window;
  return { width: innerWidth, height: innerHeight };
}

customElements.define('youtube-player-ui', YoutubePlayerUi);

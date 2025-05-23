import { matchKey } from "../key-match/key_match";
import { GradebookMgr } from "./gradebook_mgr";
import { ScoreBoard, ScoreboardType } from "./score-board/ScoreBoard";

class Zoom {
  constructor(
    public startZoom: number = 1,
    public endZoom: number = 1,
    public durationMs: number = 1,
  ) {}
}

const audioPlaybackRate = 1.1;
export class OutputUi extends HTMLElement {
  private gradebookMgr = new GradebookMgr;
  private scoreBoard = new ScoreBoard;
  private fps = 30;
  private isPlaying = false;
  private currTimeoutId = -1;
  private zoomStartTime: number | null = null;
  private videoForCanvas: HTMLVideoElement | null = null;
  private scoreboardType = ScoreboardType.NONE;
  private zoomRallyIdx: number | null = null;
  private precomputedZoomInstructions: Zoom[] = [];
  
  connectedCallback() {
    this.innerHTML = htmlTemplate;
  }
  
  async loadProjectInUi(projectId: string) {
    await this.gradebookMgr.loadOrCreateProject(projectId);
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    video.pause();
  }
  
  handleKeydown(evt: KeyboardEvent) {
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    if (matchKey(evt, 'o')) {
      const videoUpload = this.querySelector('#videoUpload') as HTMLInputElement;
      videoUpload.click();
    } else if (matchKey(evt, 'space')) {
      evt.preventDefault();
      if (video.paused) {
        this.isPlaying = true;
        this.record();
      } else {
        this.isPlaying = false;
        window.clearTimeout(this.currTimeoutId);
        video.pause();
      }
    }
  }

  genMatchStream() {
    const canvas = this.querySelector('#canvas-output') as HTMLCanvasElement;
    const introVideo = this.querySelector('#intro-video-input') as HTMLVideoElement;
    const introAudio = this.querySelector('#intro-audio-input') as HTMLAudioElement;
    const matchVideo = this.querySelector('#match-video-input') as HTMLVideoElement;
    const outroAudio = this.querySelector('#outro-audio-input') as HTMLAudioElement;

    // TODO memo-ized these as they cannot be re-initialized
    // `HTMLMediaElement already connected previously to a different MediaElementSourceNode`
    // Set up audio mixing
    const audioContext = new AudioContext();
    const introVideoSource = audioContext.createMediaElementSource(introVideo);
    const matchVideoSource = audioContext.createMediaElementSource(matchVideo);
    const introAudioSource = audioContext.createMediaElementSource(introAudio);
    const outroAudioSource = audioContext.createMediaElementSource(outroAudio);
    const audioDestination = audioContext.createMediaStreamDestination();
    
    // Connect sources to both recording destination and audio output
    introVideoSource.connect(audioDestination);
    introVideoSource.connect(audioContext.destination);
    matchVideoSource.connect(audioDestination);
    matchVideoSource.connect(audioContext.destination);
    introAudioSource.connect(audioDestination);
    introAudioSource.connect(audioContext.destination);
    outroAudioSource.connect(audioDestination);
    outroAudioSource.connect(audioContext.destination);

    introVideo.onplay = () => {
      this.videoForCanvas = introVideo;
      window.setTimeout(() => {
        this.scoreboardType = ScoreboardType.PREVIEW;
      }, (introAudio.duration - 20) / audioPlaybackRate * 1000 );
    };
    matchVideo.onplay = () => {
      this.videoForCanvas = matchVideo;
      this.scoreboardType = ScoreboardType.CURRENT_SCORE;
    };
    outroAudio.onplay = () => {
      this.scoreboardType = ScoreboardType.FINAL_STAT;
    };

    this.drawToCanvasRecursively(canvas);

    const outputStream = canvas.captureStream(this.fps);
    // Add the mixed audio track
    outputStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
    return outputStream;
  }

  record() {
    let recordedChunks: Blob[] = [];

    // Create 1 stream and 1 recorder.
    // Orchestrate the start and stop of videos and audios
    const matchStream = this.genMatchStream();
    const mediaRecorderOptions = {
      mimeType: 'video/webm',
      frameRate: this.fps
    };
    const matchRecorder = new MediaRecorder(matchStream, mediaRecorderOptions);
    matchRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    }
    matchRecorder.onstop = () => {
      saveVideo(recordedChunks);
      recordedChunks = [];
    }

    // Orchestrate
    const introAudio = this.querySelector('#intro-audio-input') as HTMLAudioElement;
    const introVideo = this.querySelector('#intro-video-input') as HTMLVideoElement;
    const matchVideo = this.querySelector('#match-video-input') as HTMLVideoElement;
    const outroAudio = this.querySelector('#outro-audio-input') as HTMLAudioElement;
    introAudio.playbackRate = audioPlaybackRate;
    outroAudio.playbackRate = audioPlaybackRate;
    introAudio.currentTime = 235;
    // outroAudio.currentTime = 220;
    this.scoreBoard.setMatchData(this.gradebookMgr.project.matchData);
    this.precomputedZoomInstructions = this.computeZoomInstructions();

    introAudio.onpause = () => {
      introVideo.pause();
      this.jumpAndPlayRecursively();
    };
    matchVideo.onpause = () => {
      outroAudio.play();
    };
    outroAudio.onpause = () => {
      matchRecorder.stop();
    }
    introAudio.play();
    introVideo.play();
    matchRecorder.start();
  }

  private drawToCanvasRecursively(canvas: HTMLCanvasElement) {
    const videoForCanvas = this.videoForCanvas;
    const scoreboardType = this.scoreboardType;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (videoForCanvas && videoForCanvas.readyState >= 2) {
      if (this.zoomRallyIdx === null) {
        this.zoomStartTime = null;
        ctx.drawImage(videoForCanvas, 0, 0, canvas.width, canvas.height);
      } else {
        const zoomInstruction = this.precomputedZoomInstructions[this.zoomRallyIdx] || new Zoom();
        if (this.zoomStartTime === null) {
          this.zoomStartTime = performance.now();
        }
        
        const elapsed = performance.now() - this.zoomStartTime;
        const progress = Math.min(elapsed / zoomInstruction.durationMs, 1);
        const scale = zoomInstruction.startZoom - 
          ((zoomInstruction.startZoom - zoomInstruction.endZoom) * progress);
        
        const sourceWidth = videoForCanvas.videoWidth * scale;
        const sourceHeight = videoForCanvas.videoHeight * scale;
        const sourceX = (videoForCanvas.videoWidth - sourceWidth) / 2;
        const sourceY = (videoForCanvas.videoHeight - sourceHeight) / 2;
        
        ctx.drawImage(videoForCanvas, 
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        );
      }
    }
    this.scoreBoard.render(scoreboardType, ctx, canvas.width, canvas.height);

    requestAnimationFrame(() => this.drawToCanvasRecursively(canvas));
  }

  private computeZoomInstructions() {
    let currZoom = 1;
    return this.scoreBoard.rallyContexts.map(rallyCtx => {
      if (rallyCtx.isNewSet()) {
        const slowZoomIn = new Zoom(currZoom, currZoom - 0.06, 1500);
        currZoom = slowZoomIn.endZoom;
        return slowZoomIn;
      } else if (rallyCtx.isNewGame()) {
        const fastZoomIn = new Zoom(1, currZoom - 0.03, 500);
        currZoom = fastZoomIn.endZoom;
        return fastZoomIn;
      } else if (!rallyCtx.isSecondServe()) {
        if (currZoom < 1) {
          currZoom += 0.01;
        }
        return new Zoom(currZoom, currZoom);
      }
      return new Zoom(currZoom, currZoom);
    });
  }

  private setZoomRallyIdx(rallyCtxIdx: number) {
    this.zoomRallyIdx = rallyCtxIdx;
    this.zoomStartTime = null;
  }

  jumpAndPlayRecursively(rallyCtxIdx = 0) {
  // jumpAndPlayRecursively(rallyCtxIdx = 105) {
    if (!this.isPlaying) {
      return;
    }
    const rallyContexts = this.scoreBoard.rallyContexts;
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    const rallyCtx = rallyContexts[rallyCtxIdx];
    this.scoreBoard.setRallyCtxIdx(rallyCtxIdx);
    this.setZoomRallyIdx(rallyCtxIdx);
    const durationMs = rallyCtx.rally.endTime.ms - rallyCtx.rally.startTime.ms;
    let rightPaddingMs = 2000;
    if (durationMs < 15000) {
      rightPaddingMs = 1500;
    } else if (durationMs < 10000) {
      rightPaddingMs = 500;
    } else if (durationMs < 6000) {
      rightPaddingMs = 100;
    }
    let leftPaddingMs = 1000;
    video.currentTime = (rallyCtx.rally.startTime.ms - leftPaddingMs) / 1000;
    if (video.paused) {
      video.play();
    }
    this.currTimeoutId = window.setTimeout(() => {
      // - 2 because there is an empty rally context at the end.
      if (rallyCtxIdx < rallyContexts.length - 2) {
        this.jumpAndPlayRecursively(rallyCtxIdx + 1);
      } else {
        video.pause();
      }
    }, durationMs + rightPaddingMs + leftPaddingMs);
    window.setTimeout(() => {
      if (rallyCtxIdx < rallyContexts.length - 1) {
        this.scoreBoard.setRallyCtxIdx(rallyCtxIdx + 1);
      }
    }, durationMs + leftPaddingMs);
  }
}

function saveVideo(recordedChunks: Blob[]) {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `output_${formatDate(new Date)}.webm`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

const htmlTemplate = `
<input type="file" id="videoUpload" accept="video/*" style='display:none;'>
<div class="inputoutput">
<canvas id="canvas-output" width='1280' height='720'></canvas>
<div class="caption">canvasOutput</div>
</div>
<div>
  <video id="match-video-input" controls src='./test_data/4-5/match.mp4'></video>
</div>
<div>
  <video id="intro-video-input" controls src='./test_data/4-5/warm-up.mp4'></video>
</div>
<audio id="intro-audio-input" src='./test_data/4-5/intro.wav' style='display:none;'></audio>
<audio id="outro-audio-input" src='./test_data/4-5/outro.wav' style='display:none;'></audio>
`
customElements.define('output-ui', OutputUi);
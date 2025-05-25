import { matchKey } from "../key-match/key_match";
import { GradebookMgr } from "./gradebook_mgr";
import { ScoreBoard, ScoreboardType } from "./score-board/ScoreBoard";

class Zoom {
  constructor(
    public startZoom: number = 1,
    public endZoom: number = 1,
    public durationMs: number = 1,
    public startMs: number = 0,
  ) {}
}

enum Stage {
  PAUSED = 'PAUSED',
  INTRO = 'INTRO',
  BODY = 'BODY',
  OUTRO = 'OUTRO',
}

const audioPlaybackRate = 1.1;
export class OutputUi extends HTMLElement {
  private gradebookMgr = new GradebookMgr;
  private scoreBoard = new ScoreBoard;
  private fps = 30;
  private longTimeouts: number[] = [];
  private zoomStartTime: number | null = null;
  private videoForCanvas: HTMLVideoElement | null = null;
  private scoreboardType = ScoreboardType.NONE;
  private zoomRallyIdx: number | null = null;
  private precomputedZoomInstructions: Zoom[] = [];
  private matchRecorder: MediaRecorder | null = null;
  private stage: Stage = Stage.PAUSED;
  
  connectedCallback() {
    this.innerHTML = htmlTemplate;
  }
  
  async loadProjectInUi(projectId: string) {
    await this.gradebookMgr.loadOrCreateProject(projectId);
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    video.pause();
  }
  
  handleKeydown(evt: KeyboardEvent) {
    if (matchKey(evt, 'o')) {
      const videoUpload = this.querySelector('#videoUpload') as HTMLInputElement;
      videoUpload.click();
    } else if (matchKey(evt, 'space')) {
      evt.preventDefault();
      if (this.stage === Stage.PAUSED) {
        this.startIntro();
      } else if (this.stage === Stage.INTRO) {
        this.startBody();
      } else if (this.stage === Stage.BODY) {
        this.startOutro();
      } else if (this.stage === Stage.OUTRO) {
        this.startPaused();
      }
    } else if (matchKey(evt, 'right')) {
      this.cleanupStage();
      this.playBodyAndSkipRecursively(this.scoreBoard.rallyCtxIdx + 1);
    } else if (matchKey(evt, 'left')) {
      this.cleanupStage();
      this.playBodyAndSkipRecursively(this.scoreBoard.rallyCtxIdx - 1);
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

    this.drawToCanvasRecursively(canvas);

    const outputStream = canvas.captureStream(this.fps);
    // Add the mixed audio track
    outputStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
    return outputStream;
  }

  startAndRecord() {
    let recordedChunks: Blob[] = [];

    // Create 1 stream and 1 recorder.
    // Orchestrate the start and stop of videos and audios
    const matchStream = this.genMatchStream();
    const mediaRecorderOptions = {
      mimeType: 'video/webm',
      frameRate: this.fps
    };
    this.matchRecorder = new MediaRecorder(matchStream, mediaRecorderOptions);
    this.matchRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    }
    this.matchRecorder.onstop = () => {
      saveVideo(recordedChunks);
      recordedChunks = [];
    }

    // Orchestrate
    const introAudio = this.querySelector('#intro-audio-input') as HTMLAudioElement;
    const introVideo = this.querySelector('#intro-video-input') as HTMLVideoElement;
    const outroAudio = this.querySelector('#outro-audio-input') as HTMLAudioElement;
    introAudio.playbackRate = audioPlaybackRate;
    outroAudio.playbackRate = audioPlaybackRate;
    // introAudio.currentTime = 235;
    // outroAudio.currentTime = 220;
    this.scoreBoard.setMatchData(this.gradebookMgr.project.matchData);
    this.precomputedZoomInstructions = this.computeZoomInstructions();

    // Triggering next stage
    introAudio.onpause = () => this.startBody();
    outroAudio.onpause = () => this.startPaused();

    introAudio.play();
    introVideo.play();
    this.matchRecorder.start();
  }

  private cleanupStage() {
    this.longTimeouts.forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });
    this.longTimeouts = [];
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    video.pause();
    const introVideo = this.querySelector('#intro-video-input') as HTMLVideoElement;
    introVideo.pause();
    const outroAudio = this.querySelector('#outro-audio-input') as HTMLAudioElement;
    outroAudio.pause();
    const introAudio = this.querySelector('#intro-audio-input') as HTMLAudioElement;
    introAudio.pause();
  }

  private startIntro() {
    if (this.stage === Stage.INTRO) {
      return;
    }
    this.stage = Stage.INTRO;
    this.cleanupStage();

    const introVideo = this.querySelector('#intro-video-input') as HTMLVideoElement;
    const introAudio = this.querySelector('#intro-audio-input') as HTMLAudioElement;
    this.videoForCanvas = introVideo;
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.NAMES;
    }, 4000));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.NONE;
    }, 10000));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.PREVIEW;
    }, (introAudio.duration - 20) / audioPlaybackRate * 1000));
    this.startAndRecord();
  }
  private startBody() {
    if (this.stage === Stage.BODY) {
      return;
    }
    this.stage = Stage.BODY;
    this.cleanupStage();

    const matchVideo = this.querySelector('#match-video-input') as HTMLVideoElement;
    this.videoForCanvas = matchVideo;
    this.playBodyAndSkipRecursively(); 
  }
  private startOutro() {
    if (this.stage === Stage.OUTRO) {
      return;
    }
    this.stage = Stage.OUTRO;
    this.cleanupStage();
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    video.play();
    window.setTimeout(() => {
      video.pause();
      this.videoForCanvas = null;
    }, 500);

    const durationMs = 35000;
    this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_9;
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_2;
    }, durationMs));
    
    const shorterDurationMs = 15000;
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_3;
    }, durationMs + shorterDurationMs));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_4;
    }, durationMs + shorterDurationMs * 2));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_5;
    }, durationMs + shorterDurationMs * 3));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_6;
    }, durationMs + shorterDurationMs * 4));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_7;
    }, durationMs + shorterDurationMs * 5));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_8;
    }, durationMs + shorterDurationMs * 6));
    this.longTimeouts.push(window.setTimeout(() => {
      this.scoreboardType = ScoreboardType.END_OF_MATCH_STAT_9;
    }, durationMs + shorterDurationMs * 7));
    
    const outroAudio = this.querySelector('#outro-audio-input') as HTMLAudioElement;
    outroAudio.play();
  }

  private startPaused() {
    if (this.stage === Stage.PAUSED) {
      return;
    }
    this.matchRecorder?.stop();
    this.stage = Stage.PAUSED;
    this.cleanupStage();
  }

  private drawToCanvasRecursively(canvas: HTMLCanvasElement) {
    if (this.stage === Stage.PAUSED) {
      return;
    }
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
        
        const elapsed = Math.max(0, performance.now() - this.zoomStartTime - zoomInstruction.startMs);
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
        const slowZoomIn = new Zoom(1, 1 - 0.05, 1500, 1000);
        currZoom = slowZoomIn.endZoom;
        return slowZoomIn;
      } else if (rallyCtx.isNewGame()) {
        const fastZoomIn = new Zoom(1, 1 - 0.02, 500, 1000);
        currZoom = fastZoomIn.endZoom;
        return fastZoomIn;
      } else if (!rallyCtx.isSecondServe()) {
        if (currZoom < 1) {
          currZoom += 0.005;
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

  playBodyAndSkipRecursively(rallyCtxIdx = 0) {
  // playBodyAndSkipRecursively(rallyCtxIdx = 105) {
    if (this.stage !== Stage.BODY) {
      return;
    }
    const rallyContexts = this.scoreBoard.rallyContexts;
    const video = this.querySelector('#match-video-input') as HTMLVideoElement;
    const rallyCtx = rallyContexts[rallyCtxIdx];
    if (rallyCtx.isNewGame()) {
      this.scoreboardType = ScoreboardType.CURRENT_SCORE;
    } else {
      this.scoreboardType = ScoreboardType.CURRENT_SCORE_WITH_HISTORY;
    }
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
    let leftPaddingMs = rallyCtx.isNewSet() ? 3000 : (rallyCtx.isNewGame() ? 2500 : 1000);
    video.currentTime = (rallyCtx.rally.startTime.ms - leftPaddingMs) / 1000;
    if (video.paused) {
      video.play();
    }
    const longTimeout = window.setTimeout(() => {
      const nextRallyCtx = rallyContexts[rallyCtxIdx + 1];
      // - 2 because there is an empty rally context at the end.
      if (!nextRallyCtx || rallyCtxIdx >= rallyContexts.length - 2) {
        this.startOutro();
        return;
      }

      if (!nextRallyCtx.isNewGame() || rallyCtxIdx >= rallyContexts.length - 4) {
        this.playBodyAndSkipRecursively(rallyCtxIdx + 1);
        return;
      }

      // For a new game in the middle of the match, show END_OF_GAME_STAT for 6 seconds
      // before going to the next rally.
      this.scoreboardType = ScoreboardType.END_OF_GAME_STAT;
      const longTimeout0 = window.setTimeout(() => {
        video.pause();
      }, 500);
      this.longTimeouts.push(longTimeout0);
      const longTimeout1 = window.setTimeout(() => {
        this.playBodyAndSkipRecursively(rallyCtxIdx + 1);
      }, 6000);
      this.longTimeouts.push(longTimeout1);
      return;
    }, durationMs + rightPaddingMs + leftPaddingMs);
    this.longTimeouts.push(longTimeout);
    const longTimeout2 = window.setTimeout(() => {
      if (rallyCtxIdx < rallyContexts.length - 1) {
        this.scoreBoard.setRallyCtxIdx(rallyCtxIdx + 1);
      }
    }, durationMs + leftPaddingMs);
    this.longTimeouts.push(longTimeout2);
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

const dirPath = './test_data/4-5';

const htmlTemplate = `
<input type="file" id="videoUpload" accept="video/*" style='display:none;'>
<div class="inputoutput">
<canvas id="canvas-output" width='1280' height='720'></canvas>
<div class="caption">canvasOutput</div>
</div>
<div>
  <video id="match-video-input" controls src='${dirPath}/match.mp4'></video>
</div>
<div>
  <video id="intro-video-input" controls src='${dirPath}/warm-up.mp4'></video>
</div>
<audio id="intro-audio-input" src='${dirPath}/intro.wav' style='display:none;'></audio>
<audio id="outro-audio-input" src='${dirPath}/outro.wav' style='display:none;'></audio>
`
customElements.define('output-ui', OutputUi);
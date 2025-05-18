import { matchKey } from "../key-match/key_match";
import { GradebookMgr } from "./gradebook_mgr";
import { ScoreBoard } from "./score-board/ScoreBoard";

export class OutputUi extends HTMLElement {
  private gradebookMgr = new GradebookMgr;
  private scoreBoard = new ScoreBoard;
  private fps = 30;
  private isPlaying = false;
  private currTimeoutId = -1;
  
  connectedCallback() {
    this.innerHTML = htmlTemplate;
  }
  
  async loadProjectInUi(projectId: string) {
    await this.gradebookMgr.loadOrCreateProject(projectId);
    const video = this.querySelector('#video-input') as HTMLVideoElement;
    video.pause();
  }
  
  handleKeydown(evt: KeyboardEvent) {
    const video = this.querySelector('#video-input') as HTMLVideoElement;
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

  record() {
    const canvas = this.querySelector('#canvas-output') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const video = this.querySelector('#video-input') as HTMLVideoElement;
    this.scoreBoard.setMatchData(this.gradebookMgr.project.matchData);

    const drawVideoToCanvasRecursively = () => {
      // Check if the video is ready to play
      if (video.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      this.scoreBoard.render(ctx, canvas.height);
      requestAnimationFrame(drawVideoToCanvasRecursively);
    };
    drawVideoToCanvasRecursively();

    const outputStream = canvas.captureStream(this.fps);
    // TODO see if we need to optimize via https://stackoverflow.com/a/71004151
    // Casting: https://stackoverflow.com/a/68044674
    const vStream = (video as any).captureStream();
    outputStream.addTrack(vStream.getAudioTracks()[0]);
    const mediaRecorder = new MediaRecorder(outputStream, { mimeType: 'video/mp4' });
    let recordedChunks: Blob[] = [];
    video.onpause = function() {
      mediaRecorder.stop();
    }
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
        saveVideo(recordedChunks);
        recordedChunks = [];
    };

    this.jumpAndPlayRecursively();
    mediaRecorder.start();
  }

  jumpAndPlayRecursively(rallyCtxIdx = 0) {
  // jumpAndPlayRecursively(rallyCtxIdx = 1) {
    if (!this.isPlaying) {
      return;
    }
    const rallyContexts = this.scoreBoard.rallyContexts;
    const video = this.querySelector('#video-input') as HTMLVideoElement;
    const rallyCtx = rallyContexts[rallyCtxIdx];
    this.scoreBoard.setRallyCtxIdx(rallyCtxIdx);
    const durationMs = rallyCtx.rally.endTime.ms - rallyCtx.rally.startTime.ms;
    let rightPaddingMs = 3000;
    if (durationMs < 12000) {
      rightPaddingMs = 2000;
    } else if (durationMs < 8000) {
      rightPaddingMs = 800;
    } else if (durationMs < 5000) {
      rightPaddingMs = 200;
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
  const blob = new Blob(recordedChunks, { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `output_${formatDate(new Date)}.mp4`;
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
  <video id="video-input" controls src='./test_data/test.mp4'></video>
</div>
`
customElements.define('output-ui', OutputUi);
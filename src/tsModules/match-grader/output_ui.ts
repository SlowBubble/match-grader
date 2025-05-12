import { matchKey } from "../key-match/key_match";
import { GradebookMgr } from "./gradebook_mgr";
import { RallyContext } from "./models/rally_context";
import { Score } from "./models/score";

const fps = 30;
export class OutputUi extends HTMLElement {
  private gradebookMgr = new GradebookMgr;
  private currScore: Score = new Score;
  
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
        this.record();
      } else {
        video.pause();
      }
    }
  }

  record() {
    const rallyContexts = this.gradebookMgr.project.matchData.getRallyContexts();
    const canvas = this.querySelector('#canvas-output') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const video = this.querySelector('#video-input') as HTMLVideoElement;

    const drawVideoToCanvas = () => {
      // Check if the video is ready to play
      if (video.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      renderTable(ctx, scoreToListOfLists(this.currScore, this.gradebookMgr.project.matchData.myName, this.gradebookMgr.project.matchData.oppoName));
      requestAnimationFrame(drawVideoToCanvas);
    };
    drawVideoToCanvas();

    const outputStream = canvas.captureStream(fps);
    // TODO see if we need to optimize via https://stackoverflow.com/a/71004151
    // Casting: https://stackoverflow.com/a/68044674
    const vStream = (video as any).captureStream();
    outputStream.addTrack(vStream.getAudioTracks()[0]);
    const mediaRecorder = new MediaRecorder(outputStream, { mimeType: 'video/webm' });
    const recordedChunks: Blob[] = [];
    video.onpause = function() {
      mediaRecorder.stop();
    }
    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        // saveVideo(recordedChunks);
    };

    this.jumpAndPlayRecursively(rallyContexts);
    mediaRecorder.start();
  }

  jumpAndPlayRecursively(rallyContexts: RallyContext[], rallyCtxIdx = 0) {
    const video = this.querySelector('#video-input') as HTMLVideoElement;
    const rallyCtx = rallyContexts[rallyCtxIdx];
    this.currScore = rallyCtx.scoreBeforeRally;
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
    setTimeout(() => {
      if (rallyCtxIdx < rallyContexts.length - 1) {
        this.jumpAndPlayRecursively(rallyContexts, rallyCtxIdx + 1);
      } else {
        video.pause();
      }
    }, durationMs + rightPaddingMs + leftPaddingMs);
    // setTimeout(() => {
    //   this.currScore = rallyCtx.getScoreAfterRally();
    // }
    // , durationMs + leftPaddingMs);
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

function scoreToListOfLists(score: Score, p1Name: string, p2Name: string) {
  const row1 = [p1Name];
  score.p1.gamesByCompletedSet.forEach((games) => {
    row1.push(games.toString());
  });
  row1.push(score.p1.games.toString());
  row1.push(score.p1.points.toString().padStart(2, '0'));

  const row2 = [p2Name];
  score.p2.gamesByCompletedSet.forEach((games) => {
    row2.push(games.toString());
  });
  row2.push(score.p2.games.toString());
  row2.push(score.p2.points.toString().padStart(2, '0'));
  return [row1, row2];
}

function renderTable(ctx: CanvasRenderingContext2D, table: string[][]) {  
  const CELL_PADDING = 16;
  const textSize = 24;
  ctx.font = `bold ${textSize}px Arial`;
  
  // Calculate column widths
  const colWidths = new Array(table[0].length).fill(0);
  table.forEach(row => {
    row.forEach((cell, colIndex) => {
      const textWidth = ctx.measureText(cell).width;
      colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
    });
  });

  const textHeight = textSize * 3 / 4; // Decrease this because text height is not centered
  const cellHeight = textHeight + (CELL_PADDING * 2);
  const xOffset = 10;
  const yOffset = 10;

  table.forEach((row, rowIndex) => {
    let x = xOffset;
    row.forEach((cell, colIndex) => {
      const cellWidth = colWidths[colIndex];
      ctx.fillStyle = '#00008B';
      ctx.fillRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
      ctx.strokeStyle = 'white';
      ctx.strokeRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
      ctx.fillStyle = 'white';
      // Center text vertically by adding CELL_PADDING + textHeight
      ctx.fillText(cell, x + CELL_PADDING, yOffset + (rowIndex * cellHeight) + CELL_PADDING + textHeight);
      x += cellWidth;
    });
  });
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
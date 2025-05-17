import { matchKey } from "../key-match/key_match";
import { GradebookMgr } from "./gradebook_mgr";
import { RallyContext } from "./models/rally_context";
import { Score } from "./models/score";

class  ScoreBoard {
  public currScore: Score = new Score;
  public currRallyCtx = new RallyContext;
}

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
    const rallyContexts = this.gradebookMgr.project.matchData.getRallyContexts();
    const canvas = this.querySelector('#canvas-output') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const video = this.querySelector('#video-input') as HTMLVideoElement;

    const drawVideoToCanvas = () => {
      // Check if the video is ready to play
      if (video.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      // TODO do we need to memoize scoreToListOfLists to avoid re-computing every frame?
      const listOfLists = scoreToListOfLists(this.scoreBoard, this.gradebookMgr.project.matchData.myName, this.gradebookMgr.project.matchData.oppoName);
      renderTable(ctx, listOfLists, canvas.height);
      requestAnimationFrame(drawVideoToCanvas);
    };
    drawVideoToCanvas();

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

    // TODO think of a better way to trigger this.
    mediaRecorder.onstop = () => {
        saveVideo(recordedChunks);
        recordedChunks = [];
    };

    this.jumpAndPlayRecursively(rallyContexts, rallyContexts.length - 3);
    mediaRecorder.start();
  }

  jumpAndPlayRecursively(rallyContexts: RallyContext[], rallyCtxIdx = 0) {
    if (!this.isPlaying) {
      return;
    }
    const video = this.querySelector('#video-input') as HTMLVideoElement;
    const rallyCtx = rallyContexts[rallyCtxIdx];
    this.scoreBoard.currRallyCtx = rallyCtx;
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
        this.jumpAndPlayRecursively(rallyContexts, rallyCtxIdx + 1);
      } else {
        video.pause();
      }
    }, durationMs + rightPaddingMs + leftPaddingMs);
    window.setTimeout(() => {
      if (rallyCtxIdx < rallyContexts.length - 1) {
        this.scoreBoard.currRallyCtx = rallyContexts[rallyCtxIdx + 1];
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
class CellInfo {
  constructor(
    public text: string = '',
    public color: string = '',
    public textColor: string = '',
  ) {}
}

function getColor(num: number, isSecondServe = false): string {
  if (num >= 2) {
    return '#3a3';
  } else if (num >= 1) {
    return '#272';
  } else if (num === 0) {
    if (isSecondServe) {
      return '#600';
    }
    return '#152';
  } else if (num <= -1) {
    return '#b01';
  }
  return '#901';
}

function getColorForGames(num: number): string {
  if (num >= 2) {
    return '#ff6';
  } else if (num >= 0) {
    return '#fc0';
  }
  return '#ea0';
}

function scoreToListOfLists(scoreBoard: ScoreBoard, p1Name: string, p2Name: string): CellInfo[][] {
  const score = scoreBoard.currRallyCtx.scoreBeforeRally;
  const isSecondServe = scoreBoard.currRallyCtx.isSecondServe();
  let p1ServeNum = 0;
  let p2ServeNum = 0;
  if (scoreBoard.currRallyCtx.rally.isMyServe) {
    p1ServeNum = isSecondServe ? 2 : 1;
  } else {
    p2ServeNum = isSecondServe ? 2 : 1;
  }
  const p1ServeStr = ''.padStart(p1ServeNum, '*');
  const p2ServeStr = ''.padStart(p2ServeNum, '*');

  let p1PointsColor = '';
  if (scoreBoard.currRallyCtx.rally.isMyServe) {
    p1PointsColor = getColor(score.p1.points - score.p2.points, isSecondServe);
  }
  let p2PointsColor = '';
  if (!scoreBoard.currRallyCtx.rally.isMyServe) {
    p2PointsColor = getColor(score.p2.points - score.p1.points, isSecondServe);
  }
  const row1 = [new CellInfo(p1Name)];
  const p1GamesBySet = score.p1.gamesByCompletedSet.concat([score.p1.games])
  const p2GamesBySet = score.p2.gamesByCompletedSet.concat([score.p2.games])
  p1GamesBySet.forEach((games, idx) => {
    row1.push(new CellInfo(games.toString(), getColorForGames(games - p2GamesBySet[idx]), 'black'));
  });
  row1.push(new CellInfo(`${score.getP1PointsStr()} ${p1ServeStr}`, p1PointsColor));

  const row2 = [new CellInfo(p2Name)];
  p2GamesBySet.forEach((games, idx) => {
    row2.push(new CellInfo(games.toString(), getColorForGames(games - p1GamesBySet[idx]), 'black'));
  });
  row2.push(new CellInfo(`${score.getP2PointsStr()} ${p2ServeStr}`, p2PointsColor));
  return [row1, row2];
}

function renderTable(ctx: CanvasRenderingContext2D, table: CellInfo[][], canvasHeight: number) {  
  const CELL_PADDING = 12;
  const textSize = 20;
  ctx.font = `bold ${textSize}px Arial`;
  
  // Calculate column widths
  const colWidths = new Array(table[0].length).fill(0);
  table.forEach(row => {
    row.forEach((cell, colIndex) => {
      const textWidth = ctx.measureText(cell.text).width;
      colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
    });
  });

  const textHeight = textSize * 3 / 4;
  const cellHeight = textHeight + (CELL_PADDING * 2);
  const totalTableHeight = cellHeight * table.length;
  const xOffset = 10;
  const bottomMargin = 10;
  const yOffset = canvasHeight - totalTableHeight - bottomMargin;

  table.forEach((row, rowIndex) => {
    let x = xOffset;
    row.forEach((cell, colIndex) => {
      const cellWidth = colWidths[colIndex];
      ctx.fillStyle = cell.color || 'black';
      ctx.fillRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
      ctx.strokeStyle = 'white';
      ctx.strokeRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
      ctx.fillStyle = cell.textColor || 'white';
      ctx.fillText(cell.text, x + CELL_PADDING, yOffset + (rowIndex * cellHeight) + CELL_PADDING + textHeight);
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
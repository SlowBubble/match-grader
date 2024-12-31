import { matchKey } from "../key-match/key_match";
import { YoutubePlayerUi } from "../youtube-player/youtube_player_ui";
import { Cell, CellLoc, makeOpts, MatchSheetUi } from "./match_sheet_ui";
import { GradebookMgr } from "./gradebook_mgr";
import { END_TIME_COL, LOSER_PREVIOUS_SHOT_COL, RATING_SCALE, RESULT_COL, SERVER_COL, START_TIME_COL, WINNER_LAST_SHOT_COL } from "./constants";
import { EphemeralBanner } from "../ephemeral-banner";
import { getRiskLevelStr, getShotRatingStr } from "./models/risk_level";
import { RallyResult, rallyResultToIndex, rallyResultVals } from "./models/rally";
import { Time } from "./models/Time";


// Top-level UI to handle everything
export class GradebookUi extends HTMLElement {
  private youtubePlayerUi: YoutubePlayerUi = new YoutubePlayerUi;

  private inputStartTime: Time | null = null;
  private gradebookMgr = new GradebookMgr;

  private matchSheetUi: MatchSheetUi = new MatchSheetUi;
  private banner: EphemeralBanner = new EphemeralBanner;

  connectedCallback() {
    this.innerHTML = `Loading project data.`;

    // IFrame steals the focus on click; is polling the best we can do?
    setInterval(() => {
      if (document.activeElement && document.activeElement.tagName == "IFRAME") {
        const elt = document.activeElement as HTMLIFrameElement;
        elt.blur();
      }
    }, 1000);
  }

  // Must call this to load the editor
  async loadOrCreateProjectInUi(id: string) {
    const finalProjectId = await this.gradebookMgr.loadOrCreateProject(id);

    this.innerHTML = `
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
    this.banner = this.querySelector('ephemeral-banner') as EphemeralBanner;
    this.matchSheetUi = this.querySelector('match-sheet-ui')! as MatchSheetUi;
    this.matchSheetUi.onCellClick((cellLoc: CellLoc) => {
      if (cellLoc.rowIdx < 2) {
        return;
      }
      this.gradebookMgr.project.cursor.rallyIdx = cellLoc.rowIdx - 2;
      this.gradebookMgr.project.cursor.colIdx = cellLoc.colIdx;
      this.renderSheet();
    });
    this.renderSheet();

    this.youtubePlayerUi = this.querySelector('youtube-player-ui')! as YoutubePlayerUi;
    this.updateYoutubePlayer();

    const addYoutubeBtn = this.querySelector('#add-youtube-btn')! as HTMLButtonElement;
    addYoutubeBtn.onclick = _ => this.obtainYoutubeUrl();
    return finalProjectId;
  }

  getVideoPlayerUi() {
    return this.youtubePlayerUi
  }
  handleKeydown(evt: KeyboardEvent) {
    this.handleKeydownWithoutChanges(evt);
    this.handleKeydownWithSheetChanges(evt);
  }

  async handleKeydownWithoutChanges(evt: KeyboardEvent) {
    if (matchKey(evt, 'space') || matchKey(evt, 'k')) {
      this.getVideoPlayerUi().toggleVideoPlay();
    } else if (matchKey(evt, 'y')) {
      this.obtainYoutubeUrl();
    } else if (matchKey(evt, 'z')) {
      this.getVideoPlayerUi().incrementPlaybackRate(-0.2);
    } else if (matchKey(evt, 'x')) {
      this.getVideoPlayerUi().incrementPlaybackRate(0.2);
    } else if (matchKey(evt, 'a')) {
      this.getVideoPlayerUi().resetPlaybackRate();
    } else if (matchKey(evt, 'l')) {
      this.getVideoPlayerUi().move(1.5);
    } else if (matchKey(evt, 'j')) {
      this.getVideoPlayerUi().move(-3);
    } else if (matchKey(evt, ';')) {
      this.getVideoPlayerUi().move(5);
    } else if (matchKey(evt, 'h')) {
      this.getVideoPlayerUi().move(-5);
    } else if (matchKey(evt, 'f')) {
      const width = this.getVideoPlayerUi().getIframeWidth();
      let wantWidth = width < 1000 ? width * 4 : width / 4;
      this.getVideoPlayerUi().setIframeDims(wantWidth);
    } else if (matchKey(evt, 'cmd+s')) {
      evt.preventDefault();
      this.banner.inProgress('Saving');
      const failureMsg = await this.gradebookMgr.save();
      if (failureMsg) {
        this.banner.failure(failureMsg);
      } else {
        this.banner.success('Saved!');
      }
    } else if (matchKey(evt, 'cmd+shift+s')) {
      evt.preventDefault();
      await this.cloneAndGoToProject();
    } else {
      return;
    }
    evt.preventDefault();
  }

  private async cloneAndGoToProject() {
    this.banner.inProgress('Cloning project...');
    const newId = (new Date()).toISOString();
    
    this.gradebookMgr.project.projectInfo.id = newId;
    this.gradebookMgr.project.projectInfo.owner = '';
    
    await this.gradebookMgr.save();
    window.location.href = `${location.origin}/edit.html#id=${newId}`;
  }

  handleKeydownWithSheetChanges(evt: KeyboardEvent) {
    if (matchKey(evt, 'up')) {
      this.gradebookMgr.moveRallyIdx(-1);
    } else if (matchKey(evt, 'down')) {
      this.gradebookMgr.moveRallyIdx(1);
    } else if (matchKey(evt, `\\`)) {
      this.tabSelectedCell();
    } else if (matchKey(evt, `shift+|`)) {
      this.tabSelectedCell(true);
    } else if (matchKey(evt, 'tab') || matchKey(evt, 'right')) {
      this.gradebookMgr.moveColIdx(1);
    } else if (matchKey(evt, 'shift+tab') || matchKey(evt, 'left')) {
      this.gradebookMgr.moveColIdx(-1);
    } else if (matchKey(evt, 'backspace')) {
      this.gradebookMgr.removeCurrRally();
    } else if (matchKey(evt, 'cmd+z')) {
      if (this.inputStartTime) {
        this.inputStartTime = null;
      }
    } else if (matchKey(evt, 'enter')) {
      this.enterSelectedCell();
    } else {
      return;
    }
    this.renderSheet();
    evt.preventDefault();
  }

  private enterSelectedCell() {
    const rally = this.gradebookMgr.getCurrentRally();
    if (!rally) {
      if (this.inputStartTime) {
        this.promoteRally();
        return;
      }
      this.updateInputStartTime();
      return;
    }
    const cursor = this.gradebookMgr.project.cursor;
    if (cursor.colIdx === START_TIME_COL) {
      this.youtubePlayerUi.moveTo(rally.startTime.ms);
      this.gradebookMgr.moveRallyIdx(-1);
    } else if (cursor.colIdx === END_TIME_COL) {
      this.youtubePlayerUi.moveTo(rally.endTime.ms);
      this.gradebookMgr.moveRallyIdx(-1);
    } else if (cursor.colIdx === RESULT_COL) {
      if (rally.result === RallyResult.PtReturner || rally.result === RallyResult.PtServer) {
        this.gradebookMgr.moveColIdx(1);
      } else {
        this.gradebookMgr.moveRallyIdx(-1);
      }
    } else if (cursor.colIdx === WINNER_LAST_SHOT_COL) {
      this.gradebookMgr.moveColIdx(1);
    } else if (cursor.colIdx === LOSER_PREVIOUS_SHOT_COL) {
      this.gradebookMgr.moveRallyIdx(-1);
    } else if (cursor.colIdx === SERVER_COL) {
      const name = prompt(`Enter server's name`);
      if (name) {
        if (rally.isMyServe) {
          this.gradebookMgr.project.matchData.myName = name;
        } else {
          this.gradebookMgr.project.matchData.oppoName = name;
        }
      }
    }
  }
  private tabSelectedCell(opposite = false) {
    const rally = this.gradebookMgr.getCurrentRally();
    if (!rally) {
      return;
    }
    const cursor = this.gradebookMgr.project.cursor;
    if (cursor.colIdx === RESULT_COL) {
      const idx = rallyResultToIndex.get(rally.result);
      const next = opposite ? idx - 1 : idx + 1 + rallyResultToIndex.size;
      const nextIdx = next % rallyResultToIndex.size;
      rally.result = rallyResultVals[nextIdx];
    } else if (cursor.colIdx === WINNER_LAST_SHOT_COL) {
      const ratingChange = opposite ? 1 : -1;
      rally.stat.winnerLastShotQuality = mod(
        rally.stat.winnerLastShotQuality + ratingChange, RATING_SCALE + 1);
    } else if (cursor.colIdx === LOSER_PREVIOUS_SHOT_COL) {
      const ratingChange = opposite ? -1 : 1;
      rally.stat.loserPreviousShotQuality = mod(
        rally.stat.loserPreviousShotQuality + ratingChange, RATING_SCALE + 1);
    } else if (cursor.colIdx === SERVER_COL) {
      rally.isMyServe = !rally.isMyServe;
    }
  }

  private renderSheet() {
    this.matchSheetUi.render(this.genSheet());
  }

  private obtainYoutubeUrl() {
    const url = prompt('Enter url');
    if (!url) {
      return;
    }
    const res = extractYoutubeId(url);
    if (!res.success) {
      return;
    }
    this.gradebookMgr.project.matchData.urls.push(url);
    this.updateYoutubePlayer();
  }

  private updateYoutubePlayer() {
    if (this.gradebookMgr.project.matchData.urls.length < 1) {
      return;
    }
    const {success, id} = extractYoutubeId(this.gradebookMgr.project.matchData.urls[0]);
    if (!success) {
      return;
    }
    this.youtubePlayerUi.initYoutubePlayer(id);
  }

  private getNowMs() {
    const nowSec = this.youtubePlayerUi.youtubePlayer.getCurrentTime();
    return Math.round(nowSec * 1000);
  }

  private updateInputStartTime() {
    this.inputStartTime = new Time(this.getNowMs());
    this.renderSheet();
  }

  private promoteRally() {
    if (!this.inputStartTime) {
      console.warn('cannot promote rally without inputStartTime');
      return;
    }
    const nowMs = this.getNowMs();
    const guessRes = nowMs - this.inputStartTime.ms < 3500 ? RallyResult.Fault : RallyResult.PtServer;
    this.gradebookMgr.project.matchData.addRally(this.inputStartTime, new Time(nowMs), guessRes);
    this.gradebookMgr.project.cursor.rallyIdx = this.gradebookMgr.getRelevantRallies().length - 1;
    this.gradebookMgr.project.cursor.colIdx = RESULT_COL;
    this.gradebookMgr.project.cursor.rallyIdx = 0;

    this.inputStartTime = null;
    this.renderSheet();
  }

  private genSheet(): Cell[][] {
    const project = this.gradebookMgr.project;
    const cursor = project.cursor;
    const rows = [];
    const headerRow = [
      new Cell('Server'),
      new Cell('Set'),
      new Cell('Game Score'),

      new Cell('Start'),
      new Cell('End'),
      new Cell('Result'),
      new Cell(`Winner's`),
      // new Cell(`Winner's last shot`),
      new Cell(`Loser's`),
      // new Cell(`Loser's previous shot`),
      new Cell('Plot'),
      new Cell(`Winner's risk level`),
    ];
    rows.push(headerRow);

    const myName = project.matchData.myName;
    const oppoName = project.matchData.oppoName;
    const rallyContexts = this.gradebookMgr.project.matchData.getRallyContexts();
    rallyContexts.reverse();

    const cursorAtTop = !this.gradebookMgr.getCurrentRally();
    const hasInputStartTime = this.inputStartTime !== null;
    const startTime = hasInputStartTime ?
      formatSecondsToTimeString(this.inputStartTime!.ms) :
      `<button id='input-start-time'>(Enter)</button>`;
    const endTime = hasInputStartTime ?
      `<button id='input-end-time'>(Enter)</button>` : '';
    const setupInputStartTimeBtn = () => {
      const btn = this.querySelector('#input-start-time') as HTMLButtonElement;
      if (btn) {
        btn.onclick = () => this.updateInputStartTime();
      }
    };
    const setupInputEndTimeBtn = () => {
      const btn = this.querySelector('#input-end-time') as HTMLButtonElement;
      if (btn) {
        btn.onclick = () => this.promoteRally();
      }
    };

    // The latest rallyContext should only have score and not a rally.
    const latestRallyCtx = rallyContexts[0];
    const score = latestRallyCtx.scoreBeforeRally;
    let latestPlot = latestRallyCtx.toPlot();
    if (!latestPlot && 1 < rallyContexts.length) {
      const prevRallyCtx = rallyContexts[1];
      latestPlot = prevRallyCtx.getPlotForNextRally();
    }

    const row = [
      new Cell(''),
      new Cell(latestRallyCtx.toGameScoreStr()),
      new Cell(score.toPointsStr()),

      new Cell(startTime, makeOpts({
        setupFunc: setupInputStartTimeBtn,
        selected: cursorAtTop && !hasInputStartTime,
      })),
      new Cell(endTime, makeOpts({
        setupFunc: setupInputEndTimeBtn,
        selected: cursorAtTop && hasInputStartTime,
        
      })),
      new Cell(''),
      new Cell(''),
      new Cell(''),
      new Cell(latestPlot?.text, makeOpts({
        alignRight: !latestPlot?.isMyPlot})),
      new Cell(''),
    ];
    rows.push(row);

    const ralliedContexts =  rallyContexts.slice(1);
    ralliedContexts.forEach((rallyCtx, rallyIdx) => {
      const rally = rallyCtx.rally;
      const score = rallyCtx.scoreBeforeRally;
      const rallyIsDoubleFault = rallyCtx.isDoubleFault();
      const rallyIsPoint = (
        rallyIsDoubleFault || rally.result === RallyResult.PtServer
        || rally.result === RallyResult.PtReturner);
      const winnerIsMe = (rally.isMyServe && rally.result === RallyResult.PtServer) ||
        (!rally.isMyServe && (rally.result === RallyResult.PtReturner || rallyIsDoubleFault));
      let plot;
      if (rallyIsPoint) {
        plot = rallyCtx.toPlot();
      }
      if (!plot && rallyIdx + 1 < ralliedContexts.length) {
        const prevRallyCtx = ralliedContexts[rallyIdx + 1];
        plot = prevRallyCtx.getPlotForNextRally();
      }

      const server = rally.isMyServe ? myName :
          `${"".padStart(myName.length, "_")}${oppoName}`;
      const row = [
        new Cell(
          rallyIsPoint ? server : '', makeOpts({ removeTopBorder: !rallyIsPoint })),
        new Cell(rallyCtx.toGameScoreStr(), makeOpts({ removeTopBorder: !rallyIsPoint })),
        new Cell(rallyIsPoint ? score.toPointsStr() : '', makeOpts({ removeTopBorder: !rallyIsPoint })),
        new Cell(formatSecondsToTimeString(rally.startTime.ms)),
        new Cell(`${rally.getDurationStr()}`, makeOpts({alignRight: true})),
        new Cell(rallyIdx > 0 ? rallyCtx.getResultSymbolStr() : rallyCtx.getResultStr(myName, oppoName),
            makeOpts({alignCenter: true})),
        new Cell(getShotRatingStr(true, rallyCtx), makeOpts({
        alignRight: !winnerIsMe, removeTopBorder: !rallyIsPoint})),
        new Cell(getShotRatingStr(false, rallyCtx), makeOpts({
          alignRight: winnerIsMe, removeTopBorder: !rallyIsPoint})),
        new Cell(plot?.text, makeOpts({
          alignRight: !plot?.isMyPlot, removeTopBorder: !rallyIsPoint})),
        new Cell(getRiskLevelStr(rallyCtx), makeOpts({
        alignRight: !winnerIsMe, removeTopBorder: !rallyIsPoint})),
      ];
      row.forEach((cell, colIdx) => {
        cell.opts.selected = (rallyIdx === cursor.rallyIdx) && (colIdx === cursor.colIdx);
      });
      rows.push(row);
    });
    return rows;
  }
}

function mod(x = 0, y = 1) {
  const res = x % y;
  if (res < 0) {
    return res + y;
  }
  return res;
}

function formatSecondsToTimeString(numMs: number): string {
  const numSecs = Math.round(numMs / 1000)
  const hours = Math.floor(numSecs / 3600);
  const minutes = Math.floor((numSecs % 3600) / 60);
  const seconds = numSecs % 60;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  if (hours === 0) {
    return `${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
}

// https://stackoverflow.com/a/54200105
function extractYoutubeId(url: string){
   const parts = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
   if (parts[2] === undefined) {
    return {success: false, id: ''};
   }
   return {success: true, id: parts[2].split(/[^0-9a-z_\-]/i)[0]};
}

customElements.define('gradebook-ui', GradebookUi)

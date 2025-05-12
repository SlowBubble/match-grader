import { matchKey } from "../key-match/key_match";
import { YoutubePlayerUi } from "../youtube-player/youtube_player_ui";
import { Cell, CellLoc, SheetUi } from "./sheet_ui";
import { GradebookMgr } from "./gradebook_mgr";
import { RATING_SCALE } from "./constants";
import { EphemeralBanner } from "../ephemeral-banner";
import { Rally, RallyResult, rallyResultToIndex, rallyResultVals } from "./models/rally";
import { Time } from "./models/Time";
import { mod, extractYoutubeId } from "./gradebook_util";
import { GradebookUiConfig, ColumnName } from "./gradebook_ui_config";
import { htmlTemplate } from "./gradebook_ui_template";
import { genFirstRow, genHeaderCol, genRallyRow } from "./gradebook_col";
// import { defaultSortState } from "./sort_state";
import { makeStatCellOpts, StatCell, StatUi } from "./stat_ui";
import { FilterState } from "./filter_state";

// Top-level UI to handle everything
export class GradebookUi extends HTMLElement {
  public config: GradebookUiConfig = new GradebookUiConfig;
  private youtubePlayerUi: YoutubePlayerUi = new YoutubePlayerUi;
  private currentUrlIdx = 0;
  // Only use this if useRevealedRallyIdx() == true.
  private revealedRallyIdx = 0;
  // private sortState = defaultSortState;
  private filterState = new FilterState;

  private inputStartTime: Time | null = null;
  private gradebookMgr = new GradebookMgr;

  private sheetUi: SheetUi = new SheetUi;
  private statUi: StatUi = new StatUi;
  private banner: EphemeralBanner = new EphemeralBanner;
  private resizeObserver: ResizeObserver;

  constructor() {
    super();
    this.resizeObserver = new ResizeObserver(() => this.updateStatHeight());
  }

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

  // This should only be called once as we don't clean up the resources.
  // Must call this to load the editor
  async loadOrCreateProjectInUi(id: string) {
    const finalProjectId = await this.gradebookMgr.loadOrCreateProject(id);

    this.innerHTML = htmlTemplate;
    this.banner = this.querySelector('ephemeral-banner') as EphemeralBanner;
    this.statUi = this.querySelector('stat-ui')! as StatUi;
    this.sheetUi = this.querySelector('sheet-ui')! as SheetUi;
    this.sheetUi.onCellClick((cellLoc: CellLoc) => {
      this.setRowIdxAndVideo(cellLoc.rowIdx);
      this.sheetUi.setColIdx(cellLoc.colIdx);
      this.renderSheet();
    });

    this.youtubePlayerUi = this.querySelector('youtube-player-ui')! as YoutubePlayerUi;
    const youtubeContainer = this.querySelector('#youtube-container') as HTMLElement;
    youtubeContainer.style.position = 'sticky';

    await this.updateYoutubePlayer();
    this.resizeObserver.observe(this.youtubePlayerUi);

    this.renderSheet();
    this.updateStatHeight();

    // Need to render before moving cursor since the data needed to seek video time is in the sheet.
    if (this.config.startFromBeginning) {
      this.moveCursorToFirstRally();
      this.sheetUi.setColIdx(this.getColIndex(ColumnName.GAME_SCORE));
    }
    if (this.config.enableMutation) {
      this.moveRowIdxAndVideo(1);
      this.sheetUi.setColIdx(this.getColIndex(ColumnName.START_TIME));
    }
    this.renderSheet();

    if (this.config.moveCursorUpBasedOnVideoTime) {
      window.setInterval(() => {
        if (this.youtubePlayerUi.youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING) {
          this.moveToRallyContainingTime();
        }
      }, 1000);
    }

    if (this.config.spoilerColumns.length > 0) {
      window.setInterval(() => {
        if (this.videoTimeIsBeyondCurrentRally()) {
          // TODO think of how to make this more efficient
          // Design a publisher to notify when the video time passed certain key points.
          this.renderSheet(true);
        }
      }, 1000);
    }

    // // TODO implement this
    // if (this.config.smartReplayBufferMs >= 0) {
    //   window.setInterval(() => {
    //     if (this.youtubePlayerUi.youtubePlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
    //       return;
    //     }
    //     if (this.filterState.isDefaultState()) {
    //       return;
    //     }
    //     const rally = this.getCurrRally();
    //     if (!rally) {
    //       return;
    //     }
    //     const idx = this.filterState.rallyStartTimes.findIndex(time => time.equals(rally.startTime));
    //     if (idx === -1 || idx + 1 >= this.filterState.rallyStartTimes.length) {
    //       return;
    //     }
    //     // const nextStartTime = this.filterState.rallyStartTimes[idx + 1];
    //     // const bufferMs = this.config.smartReplayBufferMs;
    //     // if (rally.endTime.ms + bufferMs < this.getCurrTime().ms) {
          
    //     // }
    //   }, 1000);
    // }

    return finalProjectId;
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
  }

  handleKeydown(evt: KeyboardEvent) {
    this.handleKeydownWithoutChanges(evt);
    this.handleKeydownWithSheetChanges(evt);
  }

  private getVideoPlayerUi() {
    return this.youtubePlayerUi
  }

  private async handleKeydownWithoutChanges(evt: KeyboardEvent) {
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
      this.getVideoPlayerUi().togglePlayerDimensions();
      const container = this.querySelector('#youtube-container') as HTMLElement;
      if (this.getVideoPlayerUi().isMaxDimensions()) {
        container.style.position = 'sticky';
      } else {
        container.style.position = '';
        console.log(container.style.position);
      }
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

  private useRevealedRallyIdx() {
    // TODO detect no custom sorting
    return this.config.hideFutureRallies;
  }

  private getCurrRallyStartTime() {
    const cell = this.sheetUi.getSelectedCell();
    if (!cell || !cell.data) {
      return;
    }
    const rally = cell.data as Rally;
    return rally.startTime;
  }

  private getCurrRally() {
    const time = this.getCurrRallyStartTime();
    if (!time) {
      return;
    }
    return this.gradebookMgr.getRally(time);
  }

  private getCurrRallyContext() {
    const rallyContexts = this.gradebookMgr.project.matchData.getRallyContexts();
    const last = rallyContexts[rallyContexts.length - 1];
    const time = this.getCurrRallyStartTime();
    if (!time) {
      return last;
    }
    return rallyContexts.find(rallyCtx => {
      return time.equals(rallyCtx.rally.startTime);
    }) || last;
    
  }

  private moveVideoToCurrentRally(paddingMs = -1000) {
    const rally = this.getCurrRally();
    if (rally) {
      const startTime = new Time(rally.startTime.ms + paddingMs, rally.startTime.videoIndex);
      this.moveTo(startTime);
    } else {
      const rallies = this.gradebookMgr.project.matchData.rallies;
      const lastRally = rallies[rallies.length - 1];
      if (lastRally) {
        const time = new Time(lastRally.endTime.ms, lastRally.endTime.videoIndex);
        if (time.greaterThan(this.getCurrTime())) {
          this.moveTo(time);
        }
      }

    }
  }

  private setRowIdxAndVideo(idx: number) {
    this.sheetUi.setRowIdx(idx);
    if (this.useRevealedRallyIdx()) {
      const rally = this.getCurrRally();
      if (!rally) {
        console.warn('getCurrRally is null');
        return;
      }
      const idx = this.gradebookMgr.findRallyIdx(rally.startTime);
      if (idx < 0) {
        console.warn('Unable to find index of current rally');

      }
      this.revealedRallyIdx = idx;
    }

    if (this.config.upDownArrowJumpsToStartTime) {
      this.moveVideoToCurrentRally();
    }
  }

  private moveRowIdxAndVideo(num: number) {
    if (this.useRevealedRallyIdx()) {
      // Moving up means num == -1, which is +1 for revealedRallyIdx.
      this.revealedRallyIdx -= num;
      // Need to render to propagate this info to the sheet data.
      this.renderSheet();
    } else {
      this.sheetUi.moveRowIdx(num);
    }

    if (this.config.enableMutation && this.sheetUi.getRowIdx() === 0) {
      if (this.inputStartTime) {
        this.sheetUi.setColIdx(this.getColIndex(ColumnName.END_TIME));
      } else {
        this.sheetUi.setColIdx(this.getColIndex(ColumnName.START_TIME));
      }
    }

    if (this.config.upDownArrowJumpsToStartTime) {
      this.moveVideoToCurrentRally();
    }
  }

  private handleKeydownWithSheetChanges(evt: KeyboardEvent) {
    if (matchKey(evt, 'up')) {
      this.moveRowIdxAndVideo(-1);
    } else if (matchKey(evt, 'down')) {
      this.moveRowIdxAndVideo(1);
    } else if (matchKey(evt, `\\`) && this.config.enableMutation) {
      this.tabSelectedCell();
    } else if (matchKey(evt, `shift+|`) && this.config.enableMutation) {
      this.tabSelectedCell(true);
    } else if (matchKey(evt, 'tab')) {
      this.sheetUi.moveColIdx(1);
    } else if (matchKey(evt, 'right')) {
      if (this.config.leftRightArrowMovesVideo) {
        this.getVideoPlayerUi().move(5);
      } else {
        this.sheetUi.moveColIdx(1);
      }
    } else if (matchKey(evt, 'shift+tab')) {
      this.sheetUi.moveColIdx(-1);
    } else if (matchKey(evt, 'left')) {
      if (this.config.leftRightArrowMovesVideo) {
        this.getVideoPlayerUi().move(-5);
      } else {
        this.sheetUi.moveColIdx(-1);
      }
    } else if (matchKey(evt, 'backspace') && this.config.enableMutation) {
      this.gradebookMgr.removeRally(this.getCurrRally());
    } else if (matchKey(evt, 'cmd+z') && this.config.enableMutation) {
      if (this.inputStartTime) {
        this.inputStartTime = null;
        this.sheetUi.setColIdx(this.getColIndex(ColumnName.START_TIME));
      }
    } else if (matchKey(evt, 'enter')) {
      if (this.config.enableMutation) {
        this.enterSelectedCell();
      } else {
        this.moveRowIdxAndVideo(-1);
      }
    } else {
      return;
    }
    this.renderSheet();
    evt.preventDefault();
  }

  private getColIndex(colName: ColumnName): number {
    const poss = this.config.visibleColumns.indexOf(colName);
    if (poss !== -1) {
      return poss;
    }
    return 0;
  }

  private enterSelectedCell() {
    const rally = this.getCurrRally();
    if (!rally) {
      if (this.inputStartTime) {
        this.promoteRally();
        return;
      }
      this.updateInputStartTime();
      return;
    }
    const col = this.config.visibleColumns[this.sheetUi.getColIdx()];

    if (col === ColumnName.START_TIME) {
      this.moveRowIdxAndVideo(-1);
    } else if (col === ColumnName.END_TIME) {
      if (this.config.upDownArrowJumpsToStartTime) {
        rally.endTime = this.getCurrTime();
        // move to start time col of next rally
        this.sheetUi.moveColIdx(-1);
        this.moveRowIdxAndVideo(-1);
      } else {
        this.moveRowIdxAndVideo(-1);
      }
    } else if (col === ColumnName.RESULT) {
      if (rally.result === RallyResult.PtReturner || rally.result === RallyResult.PtServer) {
        this.sheetUi.moveColIdx(1);
      } else {
        this.moveRowIdxAndVideo(-1);
      }
    } else if (col === ColumnName.WINNER_LAST_SHOT) {
      this.sheetUi.moveColIdx(1);
    } else if (col === ColumnName.LOSER_PREVIOUS_SHOT) {
      this.moveRowIdxAndVideo(-1);
    } else if (col === ColumnName.SERVER) {
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
    const rally = this.getCurrRally();
    if (!rally) {
      return;
    }
    const col = this.config.visibleColumns[this.sheetUi.getColIdx()];

    if (col === ColumnName.RESULT) {
      const idx = rallyResultToIndex.get(rally.result);
      const next = opposite ? idx - 1 : idx + 1 + rallyResultToIndex.size;
      const nextIdx = next % rallyResultToIndex.size;
      rally.result = rallyResultVals[nextIdx];
    } else if (col === ColumnName.WINNER_LAST_SHOT) {
      const ratingChange = opposite ? 1 : -1;
      rally.stat.winnerLastShotQuality = mod(
        rally.stat.winnerLastShotQuality + ratingChange, RATING_SCALE + 1);
    } else if (col === ColumnName.LOSER_PREVIOUS_SHOT) {
      const ratingChange = opposite ? -1 : 1;
      rally.stat.loserPreviousShotQuality = mod(
        rally.stat.loserPreviousShotQuality + ratingChange, RATING_SCALE + 1);
    } else if (col === ColumnName.SERVER) {
      rally.isMyServe = !rally.isMyServe;
    } else if (col === ColumnName.START_TIME) {
      rally.startTime.ms += opposite ? -500 : 500;
      this.moveTo(rally.startTime);
    } else if (col === ColumnName.END_TIME) {
      rally.endTime.ms += opposite ? -500 : 500;
      this.moveTo(rally.endTime);
    }
  }

  private renderSheet(revealSpoiler = false) {
    this.statUi.render(this.genStatSheet());
    this.sheetUi.render(this.genSheet(revealSpoiler));
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
    if (this.gradebookMgr.project.matchData.urls.length === 1) {
      // Only update player for first video, subsequent ones will play automatically
      this.updateYoutubePlayer();
    }
  }

  private async updateYoutubePlayer() {
    const urls = this.gradebookMgr.project.matchData.urls;
    if (urls.length < 1) {
      return;
    }
    const { success, id } = extractYoutubeId(urls[this.currentUrlIdx]);
    if (!success) {
      return;
    }
    await this.youtubePlayerUi.initYoutubePlayer(id, this.currentUrlIdx > 0);  // autoplay=true for subsequent videos
    this.youtubePlayerUi.onEnd(() => {
      if (this.currentUrlIdx < urls.length - 1) {
        this.currentUrlIdx++;
        this.updateYoutubePlayer();
      }
    });
  }

  private async moveTo(time: Time) {
    if (time.videoIndex !== this.currentUrlIdx) {
      this.currentUrlIdx = time.videoIndex;
      const urls = this.gradebookMgr.project.matchData.urls;
      const { success, id } = extractYoutubeId(urls[this.currentUrlIdx]);
      if (!success) {
        return;
      }
      await this.youtubePlayerUi.initYoutubePlayer(id, true);
      this.youtubePlayerUi.moveTo(time.ms);
    } else {
      this.youtubePlayerUi.moveTo(time.ms);
    }
  }

  private getCurrTime() {
    const nowSec = this.youtubePlayerUi.youtubePlayer.getCurrentTime();
    return new Time(Math.round(nowSec * 1000), this.currentUrlIdx);
  }

  private updateInputStartTime() {
    this.inputStartTime = this.getCurrTime();
    this.sheetUi.setColIdx(this.getColIndex(ColumnName.END_TIME));
    this.renderSheet();
  }

  private promoteRally() {
    if (!this.inputStartTime) {
      console.warn('cannot promote rally without inputStartTime');
      return;
    }
    const nowTime = this.getCurrTime();
    const guessRes = nowTime.ms - this.inputStartTime.ms < 3500 ? RallyResult.Fault : RallyResult.PtServer;
    this.gradebookMgr.project.matchData.addRally(this.inputStartTime, nowTime, guessRes);
    this.sheetUi.setColIdx(this.getColIndex(ColumnName.RESULT));
    this.sheetUi.setRowIdx(1);

    this.inputStartTime = null;
    this.renderSheet();
  }

  private moveCursorToFirstRally() {
    this.sheetUi.setColIdx(this.getColIndex(ColumnName.GAME_SCORE));
    this.setRowIdxAndVideo(0);
  }

  private videoTimeIsBeyondCurrentRally() {
    const rally = this.getCurrRally();
    if (!rally) {
      return true;
    }
    const currentTime = this.getCurrTime();
    return currentTime.videoIndex > rally.endTime.videoIndex || 
           (currentTime.videoIndex === rally.endTime.videoIndex && 
            currentTime.ms > rally.endTime.ms);
  }

  private genStatSheet() {
    const rows = [];
    const project = this.gradebookMgr.project;
    rows.push([new StatCell(''), new StatCell(project.matchData.myName), new StatCell(project.matchData.oppoName), new StatCell('Diff')]);

    const stat = this.getCurrRallyContext().matchStatBeforeRally;
    function makeRow(title: string, p1Stat: string, p2Stat: string, bold = false) {
      const boldOpt = makeStatCellOpts({bold: bold});
      const p1Pct =  parseInt(p1Stat);
      const p2Pct =  parseInt(p2Stat);
      const diff = p1Pct - p2Pct;
      const avg = (p1Pct + p2Pct) / 2;
      let diffStr = '';
      if (avg > 0) {
        const pctDiff = Math.round(diff / avg * 100);
        diffStr = `${pctDiff}%`;
      }
      return [
        new StatCell(title, boldOpt),
        new StatCell(p1Stat, boldOpt),
        new StatCell(p2Stat, boldOpt),
        new StatCell(diffStr, boldOpt)];
    }

    rows.push(makeRow('Serve #1', stat.p1Stats.getFirstServePct(), stat.p2Stats.getFirstServePct()));
    rows.push(makeRow('Serve #2', stat.p1Stats.getSecondServePct(), stat.p2Stats.getSecondServePct()));
    rows.push(makeRow('🟢(wins)', stat.getP1WinningPct(), stat.getP2WinningPct(), true));
    rows.push(makeRow('Serve #1 🟢', stat.p1Stats.getFirstServePointsWonPct(), stat.p2Stats.getFirstServePointsWonPct()));
    rows.push(makeRow('Serve #2 🟢', stat.p1Stats.getSecondServePointsWonPct(), stat.p2Stats.getSecondServePointsWonPct()));
    rows.push(makeRow('💪(forcing %)', stat.getP1ForcingChancePct(), stat.getP2ForcingChancePct(), true));
    rows.push(makeRow('Serv 1 💪', stat.getP1ForcingChancePctOn1stServe(), stat.getP2ForcingChancePctOn1stServe()));
    rows.push(makeRow('Serv 2 💪', stat.getP1ForcingChancePctOn2ndServe(), stat.getP2ForcingChancePctOn2ndServe()));
    rows.push(makeRow('Ret 1 💪', stat.getP1ForcingChancePctOn1stServeReturn(), stat.getP2ForcingChancePctOn1stServeReturn()));
    rows.push(makeRow('Ret 2 💪', stat.getP1ForcingChancePctOn2ndServeReturn(), stat.getP2ForcingChancePctOn2ndServeReturn()));
    rows.push(makeRow('💪🟢', stat.getP1ForcingWinPct(), stat.getP2ForcingWinPct(), true));
    rows.push(makeRow(`Serv 1 💪🟢`, stat.getP1ForcingWinPctOnFirstServe(), stat.getP2ForcingWinPctOnFirstServe()));
    rows.push(makeRow(`Serv 2 💪🟢`, stat.getP1ForcingWinPctOnSecondServe(), stat.getP2ForcingWinPctOnSecondServe()));
    rows.push(makeRow(`Ret 1 💪🟢`, stat.getP1ForcingWinPctOnFirstReturn(), stat.getP2ForcingWinPctOnFirstReturn()));
    rows.push(makeRow(`Ret 2 💪🟢`, stat.getP1ForcingWinPctOnSecondReturn(), stat.getP2ForcingWinPctOnSecondReturn()));
    rows.push(makeRow('UError 🔴', stat.getP1UnforcedErrorPct(), stat.getP2UnforcedErrorPct(), true));
    rows.push(makeRow('Serv 1 UE 🔴', stat.getP1UnforcedErrorPctOnFirstServe(), stat.getP2UnforcedErrorPctOnFirstServe()));
    rows.push(makeRow('Serv 2 UE 🔴', stat.getP1UnforcedErrorPctOnSecondServe(), stat.getP2UnforcedErrorPctOnSecondServe()));
    rows.push(makeRow('Ret 1 UE 🔴', stat.getP1UnforcedErrorPctOn1stServeReturn(), stat.getP2UnforcedErrorPctOn1stServeReturn()));
    rows.push(makeRow('Ret 2 UE 🔴', stat.getP1UnforcedErrorPctOn2ndServeReturn(), stat.getP2UnforcedErrorPctOn2ndServeReturn()));
    return rows;
  }

  private getAllowedRallyContexts() {
    const rallyContexts = this.gradebookMgr.project.matchData.getRallyContexts();
    if (this.filterState.isDefaultState()) {
      return rallyContexts;
    }
    const allowedStartTimeStrs = new Set();
    this.filterState.rallyStartTimes.forEach(time => allowedStartTimeStrs.add(time.toString()));
    return rallyContexts.filter(rallyCtx => allowedStartTimeStrs.has(rallyCtx.rally.startTime.toString()));
  }

  private genSheet(revealSpoiler = false): Cell[][] {
    const project = this.gradebookMgr.project;
    const rows = [];
    const headerRow = this.config.visibleColumns.map(colName => genHeaderCol(colName));
    rows.push(headerRow);

    const myName = project.matchData.myName;
    const oppoName = project.matchData.oppoName;
    const rallyContexts = this.getAllowedRallyContexts();

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
    const latestRallyCtx = rallyContexts[rallyContexts.length - 1];
    let latestPlot = latestRallyCtx.toPlot();
    if (!latestPlot && 1 < rallyContexts.length) {
      const prevRallyCtx = rallyContexts[rallyContexts.length - 2];
      latestPlot = prevRallyCtx.getPlotForNextRally();
    }

    const hideFirstRow = this.config.hideFutureRallies;
    if (!hideFirstRow) {
      rows.push(genFirstRow({
        latestRallyCtx,
        latestPlot,
        inputStartTime: this.inputStartTime,
        setupInputStartTimeBtn,
        setupInputEndTimeBtn,
        myName,
        oppoName,
      }, this.config));
    }

    const rallyRows: Cell[][] = [];
    let completedCtxsEndIdx = rallyContexts.length - 2;
    if (this.useRevealedRallyIdx()) {
      completedCtxsEndIdx = this.revealedRallyIdx;
    }
    const completedCtxs = rallyContexts.slice(0, completedCtxsEndIdx + 1);
    completedCtxs.forEach((rallyCtx, completedCtxIdx) => {
      const rallyIsPoint = rallyCtx.isDoubleFault() ||
        rallyCtx.rally.result === RallyResult.PtServer ||
        rallyCtx.rally.result === RallyResult.PtReturner;
      let plot;
      if (rallyIsPoint) {
        plot = rallyCtx.toPlot();
      }
      let prevRallyCtx = null;
      if (completedCtxIdx > 0) {
        prevRallyCtx = completedCtxs[completedCtxIdx - 1];
        if (!plot) {
          plot = prevRallyCtx.getPlotForNextRally();
        }
      }
      let revealSpoilerForRow = revealSpoiler;
      if (!revealSpoiler) {
        if (completedCtxIdx < completedCtxsEndIdx) {
          revealSpoilerForRow = true;
        } 
      }

      rallyRows.push(genRallyRow({
        prevRallyCtx,
        rallyCtx,
        myName,
        oppoName,
        plot,
        revealSpoiler: revealSpoilerForRow,
      }, this.config));
    });

    // TODO sort rallyRows
    rallyRows.reverse();

    return rows.concat(rallyRows);
  }

  private moveToRallyContainingTime(earlyMoveMs = 1000) {
    if (this.useRevealedRallyIdx()) {
      this.moveToRallyContainingTimeForWatchMode(earlyMoveMs);
    }
  }

  private moveToRallyContainingTimeForWatchMode(earlyMoveMs = 1000) {
    const currentTime = this.getCurrTime();
    const rallies = this.gradebookMgr.project.matchData.rallies;
    
    for (let idx = 0; idx < rallies.length; idx++) {
      // TODO Start from nearby and go forward to speed up the search.
      const rally = rallies[idx];
      if (currentTime.videoIndex === rally.startTime.videoIndex &&
          rally.startTime.ms - earlyMoveMs <= currentTime.ms && 
          currentTime.ms <= rally.endTime.ms - earlyMoveMs) {
        // Only update if cursor isn't already on this rally
        if (this.revealedRallyIdx !== idx) {
          this.revealedRallyIdx = idx;
          this.renderSheet();
        }
        return;
      }
    }
  }

  private updateStatHeight() {
    const player = this.querySelector('youtube-player-ui') as any;
    const statUi = this.querySelector('stat-ui') as any;
    if (player && statUi) {
      const height = player.getIframeHeight();
      statUi.updateHeight(height);
    }
  }
}

export declare namespace YT {
  enum PlayerState {
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3
  }
}

customElements.define('gradebook-ui', GradebookUi)

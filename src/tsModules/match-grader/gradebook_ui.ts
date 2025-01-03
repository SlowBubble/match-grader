import { matchKey } from "../key-match/key_match";
import { YoutubePlayerUi } from "../youtube-player/youtube_player_ui";
import { Cell, CellLoc, MatchSheetUi } from "./match_sheet_ui";
import { GradebookMgr } from "./gradebook_mgr";
import { RATING_SCALE } from "./constants";
import { EphemeralBanner } from "../ephemeral-banner";
import { RallyResult, rallyResultToIndex, rallyResultVals } from "./models/rally";
import { Time } from "./models/Time";
import { mod, extractYoutubeId } from "./gradebook_util";
import { GradebookUiConfig, ColumnName } from "./gradebook_ui_config";
import { htmlTemplate } from "./gradebook_ui_template";
import { genFirstRow, genHeaderCol, genRallyRow } from "./gradebook_col";

// Top-level UI to handle everything
export class GradebookUi extends HTMLElement {
  public config: GradebookUiConfig = new GradebookUiConfig;
  private youtubePlayerUi: YoutubePlayerUi = new YoutubePlayerUi;
  private currentUrlIdx = 0;

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

    this.innerHTML = htmlTemplate;
    this.banner = this.querySelector('ephemeral-banner') as EphemeralBanner;
    this.matchSheetUi = this.querySelector('match-sheet-ui')! as MatchSheetUi;
    this.matchSheetUi.onCellClick((cellLoc: CellLoc) => {
      if (cellLoc.rowIdx < 2) {
        return;
      }
      this.gradebookMgr.project.cursor.rallyIdx = cellLoc.rowIdx - 2;
      this.gradebookMgr.project.cursor.colIdx = cellLoc.colIdx;
      this.renderSheet();

      // TODO seek video if the rally number is changed
    });
    this.renderSheet();

    this.youtubePlayerUi = this.querySelector('youtube-player-ui')! as YoutubePlayerUi;
    this.updateYoutubePlayer();

    const addYoutubeBtn = this.querySelector('#add-youtube-btn')! as HTMLButtonElement;
    addYoutubeBtn.onclick = _ => this.obtainYoutubeUrl();
    return finalProjectId;
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

  private moveVideoToCurrentRally() {
    const rally = this.gradebookMgr.getCurrentRally();
    if (rally) {
      this.moveTo(rally.startTime);
      // TODO see if we want moveTo(endTime) if the cursor is on the end time column.
    }
  }

  private moveRallyIdxAndVideo(num: number) {
    this.gradebookMgr.moveRallyIdx(
      num, this.config.enableMutation ? this.getColIndex(ColumnName.START_TIME) : this.getColIndex(ColumnName.GAME_SCORE));
    if (this.config.upDownArrowJumpsToStartTime) {
      this.moveVideoToCurrentRally();
    }
  }

  private handleKeydownWithSheetChanges(evt: KeyboardEvent) {
    if (matchKey(evt, 'up')) {
      this.moveRallyIdxAndVideo(-1);
    } else if (matchKey(evt, 'down')) {
      this.moveRallyIdxAndVideo(1);
    } else if (matchKey(evt, `\\`) && this.config.enableMutation) {
      this.tabSelectedCell();
    } else if (matchKey(evt, `shift+|`) && this.config.enableMutation) {
      this.tabSelectedCell(true);
    } else if (matchKey(evt, 'tab')) {
      this.gradebookMgr.moveColIdx(1, this.config.visibleColumns.length);
    } else if (matchKey(evt, 'right')) {
      if (this.config.leftRightArrowMovesVideo) {
        this.getVideoPlayerUi().move(5);
      } else {
        this.gradebookMgr.moveColIdx(1, this.config.visibleColumns.length);
      }
    } else if (matchKey(evt, 'shift+tab')) {
      this.gradebookMgr.moveColIdx(-1, this.config.visibleColumns.length);
    } else if (matchKey(evt, 'left')) {
      if (this.config.leftRightArrowMovesVideo) {
        this.getVideoPlayerUi().move(-5);
      } else {
        this.gradebookMgr.moveColIdx(-1, this.config.visibleColumns.length);
      }
    } else if (matchKey(evt, 'backspace') && this.config.enableMutation) {
      this.gradebookMgr.removeCurrRally();
    } else if (matchKey(evt, 'cmd+z') && this.config.enableMutation) {
      if (this.inputStartTime) {
        this.inputStartTime = null;
      }
    } else if (matchKey(evt, 'enter') && this.config.enableMutation) {
      this.enterSelectedCell();
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
    const col = this.config.visibleColumns[cursor.colIdx];

    if (col === ColumnName.START_TIME) {
      this.moveRallyIdxAndVideo(-1);
    } else if (col === ColumnName.END_TIME) {
      if (this.config.upDownArrowJumpsToStartTime) {
        rally.endTime = this.getNowTime();
        // move to start time col of next rally
        this.gradebookMgr.moveColIdx(-1, this.config.visibleColumns.length);
        this.moveRallyIdxAndVideo(-1);
      } else {
        this.moveRallyIdxAndVideo(-1);
      }
    } else if (col === ColumnName.RESULT) {
      if (rally.result === RallyResult.PtReturner || rally.result === RallyResult.PtServer) {
        this.gradebookMgr.moveColIdx(1, this.config.visibleColumns.length);
      } else {
        this.moveRallyIdxAndVideo(-1);
      }
    } else if (col === ColumnName.WINNER_LAST_SHOT) {
      this.gradebookMgr.moveColIdx(1, this.config.visibleColumns.length);
    } else if (col === ColumnName.LOSER_PREVIOUS_SHOT) {
      this.moveRallyIdxAndVideo(-1);
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
    const rally = this.gradebookMgr.getCurrentRally();
    if (!rally) {
      return;
    }
    const cursor = this.gradebookMgr.project.cursor;
    const col = this.config.visibleColumns[cursor.colIdx];

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
    if (this.gradebookMgr.project.matchData.urls.length === 1) {
      // Only update player for first video, subsequent ones will play automatically
      this.updateYoutubePlayer();
    }
  }

  private updateYoutubePlayer() {
    const urls = this.gradebookMgr.project.matchData.urls;
    if (urls.length < 1) {
      return;
    }
    const { success, id } = extractYoutubeId(urls[this.currentUrlIdx]);
    if (!success) {
      return;
    }
    this.youtubePlayerUi.initYoutubePlayer(id, this.currentUrlIdx > 0);  // autoplay=true for subsequent videos
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

  private getNowTime() {
    const nowSec = this.youtubePlayerUi.youtubePlayer.getCurrentTime();
    return new Time(Math.round(nowSec * 1000));
  }

  private updateInputStartTime() {
    this.inputStartTime = this.getNowTime();
    this.renderSheet();
  }

  private promoteRally() {
    if (!this.inputStartTime) {
      console.warn('cannot promote rally without inputStartTime');
      return;
    }
    const nowTime = this.getNowTime();
    const guessRes = nowTime.ms - this.inputStartTime.ms < 3500 ? RallyResult.Fault : RallyResult.PtServer;
    this.gradebookMgr.project.matchData.addRally(this.inputStartTime, nowTime, guessRes);
    this.gradebookMgr.project.cursor.rallyIdx = this.gradebookMgr.getRelevantRallies().length - 1;
    this.gradebookMgr.project.cursor.colIdx = this.getColIndex(ColumnName.RESULT);
    this.gradebookMgr.project.cursor.rallyIdx = 0;

    this.inputStartTime = null;
    this.renderSheet();
  }

  private genSheet(): Cell[][] {
    const project = this.gradebookMgr.project;
    const cursor = project.cursor;
    const rows = [];
    const headerRow = this.config.visibleColumns.map(colName => genHeaderCol(colName));
    rows.push(headerRow);

    const myName = project.matchData.myName;
    const oppoName = project.matchData.oppoName;
    const rallyContexts = this.gradebookMgr.project.matchData.getRallyContexts();
    rallyContexts.reverse();

    const cursorAtTop = !this.gradebookMgr.getCurrentRally();
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
    let latestPlot = latestRallyCtx.toPlot();
    if (!latestPlot && 1 < rallyContexts.length) {
      const prevRallyCtx = rallyContexts[1];
      latestPlot = prevRallyCtx.getPlotForNextRally();
    }

    const hideFirstRow = !cursorAtTop && this.config.hideFutureRallies;
    if (!hideFirstRow) {
      rows.push(genFirstRow({
        latestRallyCtx,
        latestPlot,
        inputStartTime: this.inputStartTime,
        cursorAtTop,
        setupInputStartTimeBtn,
        setupInputEndTimeBtn,
      }, this.config));
    }

    let firstRallyIdxToShow = 1;
    if (this.config.hideFutureRallies) {
      firstRallyIdxToShow = Math.max(cursor.rallyIdx - 1, 1);
    }
    const ralliedContexts = rallyContexts.slice(firstRallyIdxToShow);
    ralliedContexts.forEach((rallyCtx, rallyIdx) => {
      const rallyIsPoint = rallyCtx.isDoubleFault() ||
        rallyCtx.rally.result === RallyResult.PtServer ||
        rallyCtx.rally.result === RallyResult.PtReturner;
      let plot;
      if (rallyIsPoint) {
        plot = rallyCtx.toPlot();
      }
      if (!plot && rallyIdx + 1 < ralliedContexts.length) {
        const prevRallyCtx = ralliedContexts[rallyIdx + 1];
        plot = prevRallyCtx.getPlotForNextRally();
      }

      rows.push(genRallyRow({
        rallyCtx,
        myName,
        oppoName,
        rallyIdx: rallyIdx + firstRallyIdxToShow - 1,
        cursor,
        plot,
      }, this.config));
    });
    return rows;
  }
}

customElements.define('gradebook-ui', GradebookUi)

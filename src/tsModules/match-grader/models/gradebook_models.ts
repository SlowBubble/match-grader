import { Rally, RallyResult } from "./rally";
import { RallyContext } from "./rally_context";
import { isTieBreakTime } from "./score";
import { Time } from "./Time";

export class GradebookProject {
  constructor(
    public projectInfo = new ProjectInfo(),
    public matchData = new MatchData(),
    public layout = new Layout(),
    public cursor = new Cursor(),
  ) {}

  static deserialize(json: any) {
    return new GradebookProject(
      ProjectInfo.deserialize(json.projectInfo),
      MatchData.deserialize(json.matchData),
      Layout.deserialize(json.layout),
      Cursor.deserialize(json.cursor),
    );
  }
  serialize() {
    return JSON.stringify(this);
  }
  toJson() {
    return JSON.parse(this.serialize());
  }
}

export class Cursor {
  constructor(
    // rallyIdx < relevantRallies.length. -1 --> creating a new rally.
    public rallyIdx = -1,
    public colIdx = 0,
  ) {}
  static deserialize(json: any) {
    return new Cursor(
      json.rallyIdx,
      json.colIdx
    );
  }
}

export class Layout {
  constructor(
    public customColHeaders: string[] = [],
  ) {}
  static deserialize(json: any) {
    return new Layout(
      json.customColHeaders,
    );
  }
}
export class ProjectInfo {
  constructor(
    public id = '',
    // uid
    public owner = '',
    public ownerEmail = '',
    public createdAt = (new Date()).toISOString(),
    public lastEditedAt = (new Date()).toISOString(),
  ) {}
  static deserialize(json: any) {
    return new ProjectInfo(
      json.id,
      json.owner,
      json.ownerEmail || '',
      json.createdAt,
      json.lastEditedAt,
    );
  }
}

export enum ScoringSystem {
  TIEBREAK_7_POINT = 'TIEBREAK_7_POINT',
  TIEBREAK_10_POINT = 'TIEBREAK_10_POINT',
  PRO_SET_6_GAME = 'PRO_SET_6_GAME',
  RALLY = 'RALLY',
  // PRO_SET_8_GAME,
  // FAST_4,
  // CUSTOM,
}

export class MatchData {
  constructor(
    public scoringSystem = ScoringSystem.PRO_SET_6_GAME,
    public rallies: Rally[] = [],
    public myName = 'Me',
    public oppoName = 'Opponent',
    public urls: string[] = [],
  ) {}

  static deserialize(json: any) {
    return new MatchData(
      json.scoringSystem,
      json.rallies.map((rallyObj: Object) => Rally.deserialize(rallyObj)),
      json.myName,
      json.oppoName,
      json.urls,
    );
  }

  getRallyContexts() {
    const contexts: RallyContext[] = [];
    let currContext = new RallyContext();
    this.rallies.forEach((rally) => {
      currContext.rally = rally.clone();
      contexts.push(currContext);

      const nextContext = new RallyContext();
      nextContext.scoreBeforeRally = currContext.getScoreAfterRally();
      currContext = nextContext;
    });
    contexts.push(currContext);
    return contexts;
  }

  inferIsMyServe() {
    if (this.rallies.length === 0) {
      // Guess
      return true;
    }
    const finalRally = this.rallies[this.rallies.length - 1];
    const rallyContexts = this.getRallyContexts();
    const finalScoreContext = rallyContexts[rallyContexts.length - 1];
    const finalScore = finalScoreContext.scoreBeforeRally;
    const finalRallyIsNotAPoint = 
      finalScoreContext.isSecondServe() || (
        finalRally.result !== RallyResult.PtReturner && finalRally.result !== RallyResult.PtServer
        && finalRally.result !== RallyResult.Fault);
    if (finalRallyIsNotAPoint) {
      return finalRally.isMyServe;
    }

    if (isTieBreakTime(finalScore.p1, finalScore.p2)) {
      if (finalScore.p1.points === 0 && finalScore.p2.points === 0) {
        return !finalRally.isMyServe;
      }
      const oddNumPts = ((finalScore.p1.points + finalScore.p2.points) % 2) === 1;
      return oddNumPts ? !finalRally.isMyServe : finalRally.isMyServe;
    }

    if (!finalScoreContext.isNewGame()) {
      return finalRally.isMyServe;
    }
    // finalScore is the score after the game point conversion (i.e. a new game)
    // so go back 1 rally to get the score of the tiebreak game point.
    const gamePointRallyCtx = rallyContexts[rallyContexts.length - 2];
    const gamePointScore = gamePointRallyCtx.scoreBeforeRally;
    const isPrevGameATiebreak = isTieBreakTime(gamePointScore.p1, gamePointScore.p2);
    if (!isPrevGameATiebreak) {
      return !finalRally.isMyServe;
    }
    // For a tiebreak, the player who serve second will serve the next game.
    const tiebreakIsMyServeGame = gamePointRallyCtx.isMyServeGame();
    return !tiebreakIsMyServeGame;
  }

  addRally(startTime: Time, endTime: Time, result = RallyResult.Fault) {
    this.rallies.push(new Rally(startTime, endTime, result, this.inferIsMyServe()));
    // TODO sort by endTime.
  }
}



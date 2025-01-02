import { GradebookProject } from "./models/gradebook_models";
import { FirestoreDao } from "./firestore_dao";
import { START_TIME_COL, TOTAL_COLS } from "./constants";
import { auth } from "../firebase/config";

const dao = new FirestoreDao();

// Handle Gradebook operations (unrelated to the UI).
export class GradebookMgr {
  public project: GradebookProject = new GradebookProject;

  async save() {
    if (!auth.currentUser) {
      return `Please sign in before saving.`;
    }
    const info = this.project.projectInfo;
    const userIsNotOwner = info.owner && info.owner !== auth.currentUser.uid;
    if (userIsNotOwner) {
      // TODO: add: Try cloning instead (cmd+shift+s).
      return `You are not the owner.`
    }
    info.lastEditedAt = (new Date()).toISOString();
    // Needed for first time saving.
    info.owner = auth.currentUser.uid;
    info.ownerEmail = auth.currentUser.email || '';
    try {
      await dao.set(info.id, this.project.toJson());
    } catch(err) {
      return `Saving failed; ${err}`;
    }
    return;
  }

  async loadOrCreateProject(id: string) {
    const json = await dao.get(id);
    this.project = new GradebookProject();
    this.project.projectInfo.id = id;
    let finalProjectId = id;
    if (json) {
      this.project = GradebookProject.deserialize(json);
    } else {
      // TODO add this back if we ever run into race condition saving a new project.
      // const projectJson = this.project.toJson();
      // try {
      //   await dao.set(id, projectJson);
      // } catch (err) {
      //   finalProjectId = await dao.add(projectJson);
      // }
    }
    return finalProjectId;
  }

  getRelevantRallies() {
    return this.project.matchData.rallies.toReversed();
  }

  getCurrentRally() {
    const cursor = this.project.cursor;
    return this.getRelevantRallies()[cursor.rallyIdx];
  }

  moveRallyIdx(num = 1) {
    const cursor = this.project.cursor;
    cursor.rallyIdx += num;
    if (cursor.rallyIdx < 0) {
      cursor.rallyIdx = -1;
      cursor.colIdx = START_TIME_COL;
      return;
    }
    const rallies = this.getRelevantRallies();
    if (cursor.rallyIdx >= rallies.length) {
      cursor.rallyIdx = rallies.length - 1;
    }
  }
  moveColIdxOrUp(num = 1) {
    const cursor = this.project.cursor;
    cursor.colIdx += num;
    if (cursor.colIdx >= TOTAL_COLS) {
      cursor.colIdx = 0;
      this.moveRallyIdx(-1);
      return;
    }
    if (cursor.colIdx < 0) {
      cursor.colIdx = TOTAL_COLS - 1;
      this.moveRallyIdx(1);
    }
  }
  moveColIdx(num = 1) {
    const cursor = this.project.cursor;
    cursor.colIdx += num;
    if (cursor.colIdx >= TOTAL_COLS) {
      cursor.colIdx = TOTAL_COLS - 1;
      return;
    }
    if (cursor.colIdx < 0) {
      cursor.colIdx = 0;
    }
  }
  removeCurrRally() {
    const rallyIdx = this.project.cursor.rallyIdx;
    if (rallyIdx < 0) {
      return;
    }
    // Reversed
    const currRally = this.getCurrentRally();
    if (!currRally) {
      return;
    }
    this.project.matchData.rallies = this.project.matchData.rallies.filter(rally => {
      return !currRally.startTime.equals(rally.startTime);
    });
  }
}

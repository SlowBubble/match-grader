import { GradebookProject } from "./models/gradebook_models";
import { FirestoreDao } from "./firestore_dao";
import { auth } from "../firebase/config";
import { Time } from "./models/Time";
import { Rally } from "./models/rally";

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
    }
    return finalProjectId;
  }

  findRallyIdx(startTime: Time) {
    return this.project.matchData.rallies.findIndex(rally => {
      return startTime.equals(rally.startTime);
    });
  }

  removeRally(specifiedRally: Rally | undefined) {
    if (!specifiedRally) {
      return;
    }
    this.project.matchData.rallies = this.project.matchData.rallies.filter(rally => {
      return !specifiedRally.startTime.equals(rally.startTime);
    });
  }
  getRally(startTime: Time) {
    return this.project.matchData.rallies.find(rally => {
      return startTime.equals(rally.startTime);
    });
  }
}

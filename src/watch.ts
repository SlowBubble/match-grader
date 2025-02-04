

import { GradebookUi } from "./tsModules/match-grader/gradebook_ui";
import { GradebookUiConfig, spoilerColumnsForWatchMode, visibleColumnsForWatchMode } from "./tsModules/match-grader/gradebook_ui_config";
import { getUrlParamsMap } from "./tsModules/url-state/url";

GradebookUi;

async function main() {
  document.querySelector('#app')!.innerHTML = `
    <div>
      <gradebook-ui></gradebook-ui>
    </div>
  `
  const urlKeyVal = getUrlParamsMap();
  const projectId = urlKeyVal.get('id') || '';
  
  const matchGraderUi = document.querySelector('gradebook-ui')! as GradebookUi;
  matchGraderUi.config = new GradebookUiConfig;
  matchGraderUi.config.leftRightArrowMovesVideo = true;
  matchGraderUi.config.startFromBeginning = true;
  matchGraderUi.config.hideFutureRallies = true;
  matchGraderUi.config.enableMutation = false;
  matchGraderUi.config.visibleColumns = visibleColumnsForWatchMode;
  matchGraderUi.config.spoilerColumns = spoilerColumnsForWatchMode;

  document.body.addEventListener(
    'keydown', evt => matchGraderUi.handleKeydown(evt));
  // Create doesn't save, so it's okay even if the project doesn't exist.
  await matchGraderUi.loadOrCreateProjectInUi(projectId);
}

main();

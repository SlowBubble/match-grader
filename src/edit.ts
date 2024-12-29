

import { GradebookUi } from "./tsModules/match-grader/gradebook_ui";
import { getUrlParamsMap, setUrlParam } from "./tsModules/url-state/url";

GradebookUi;

async function main() {
  document.querySelector('#app')!.innerHTML = `
    <div>
      <gradebook-ui></gradebook-ui>
    </div>
  `
  const urlKeyVal = getUrlParamsMap();
  const inputId = urlKeyVal.get('id');
  const idViaTime = `${(new Date()).toLocaleDateString()}_${(new Date()).toLocaleTimeString()}`;
  const projectId = urlKeyVal.get('id') || idViaTime.replaceAll(/[:\/\s]/g, "-");
  
  const matchGraderUi = document.querySelector('gradebook-ui')! as GradebookUi;
  document.body.addEventListener(
    'keydown', evt => matchGraderUi.handleKeydown(evt));
  const finalProjectId = await matchGraderUi.loadOrCreateProjectInUi(projectId);
  if (inputId != finalProjectId) {
    setUrlParam('id', finalProjectId);
  }
}

main();



import { OutputUi } from "./tsModules/match-grader/output_ui";
import { getUrlParamsMap } from "./tsModules/url-state/url";

OutputUi;

async function main() {
  document.querySelector('#app')!.innerHTML = `
    <div>
      <output-ui></output-ui>
    </div>
  `
  const urlKeyVal = getUrlParamsMap();
  const idViaTime = `${(new Date()).toLocaleDateString()}_${(new Date()).toLocaleTimeString()}`;
  const projectId = urlKeyVal.get('id') || idViaTime.replaceAll(/[:\/\s]/g, "-");
  
  const outputUi = document.querySelector('output-ui')! as OutputUi;
  document.body.addEventListener(
    'keydown', evt => outputUi.handleKeydown(evt));
  await outputUi.loadProjectInUi(projectId);
}

main();

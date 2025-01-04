import { auth } from "./tsModules/firebase/config";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { FirestoreDao } from "./tsModules/match-grader/firestore_dao";
import { GradebookProject } from "./tsModules/match-grader/models/gradebook_models";

main();

function main() {
  const appHtml = document.querySelector<HTMLDivElement>('#app');
  appHtml!.innerHTML = `
    <div id='auth'></div>
    <div id='projects'><div>
  `;

  setUpAuth();
  populateProjects();
  
  // Add keyboard shortcut for create
  document.addEventListener('keydown', (event) => {
    if (event.key === 'c') {
      window.location.href = '/edit.html';
    }
  });
}

function setUpAuth() {
    // TODO add this back when production ready: <a href='/edit.html'>Create</a>
  document.querySelector<HTMLDivElement>('#auth')!.innerHTML = `
    <button id="signInBtn">Sign In with Google</button>
    <button id="signOutBtn">Sign Out</button>
  `;
  const signInBtn = document.getElementById('signInBtn') as HTMLButtonElement;
  const signOutBtn = document.getElementById('signOutBtn') as HTMLButtonElement;

  onAuthStateChanged(auth, user => {
    if (user) {
      signInBtn.style.display = 'none';
    } else {
      signOutBtn.style.display = 'none';
    }
  });
  signInBtn?.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        // const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential.accessToken;

        // The signed-in user info.
        const user = result.user;
        console.log('User id: ', user.uid)

        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'block';
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // TODO use ebanner.
        console.error('Error:', errorCode, errorMessage);
      });
  });

  signOutBtn.addEventListener('click', () => {
    auth.signOut()
      .then(() => {
        signInBtn.style.display = 'block';
        signOutBtn.style.display = 'none';
      })
      .catch((error) => {
        // TODO use ebanner.
        console.error('Error signing out:', error);
      });
  });
}

async function populateProjects() {
  const dao = new FirestoreDao();
  const docs = await dao.getAll();
  const projects = docs.map(json => GradebookProject.deserialize(json));
  const list = projects.map(project => {
    return {
      id: project.projectInfo.id,
      text: `${project.matchData.myName} vs ${project.matchData.oppoName}`,
      matchUpLink: `/watch.html#id=${project.projectInfo.id}`,
      editLink: `/edit.html#id=${project.projectInfo.id}`,
      lastEditedAt: new Date(project.projectInfo.lastEditedAt),
      owner: project.projectInfo.owner,
      rallyCount: project.matchData.rallies.length
    };
  }).sort((a, b) => b.rallyCount - a.rallyCount);  // Sort by rally count descending

  const currentUser = auth.currentUser;
  document.querySelector<HTMLDivElement>('#projects')!.innerHTML += `
    ${createTableWithLinksAndDates(list, currentUser?.uid)}
  `;

  // Add click handlers for delete buttons
  const deleteButtons = document.querySelectorAll<HTMLButtonElement>('.delete-project');
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const projectId = button.dataset.projectId;
      if (projectId && confirm('Are you sure you want to delete this project?')) {
        await dao.delete(projectId);
        location.reload();
      }
    });
  });
}

function createTableWithLinksAndDates(items: {
    id: string, text: string, matchUpLink: string, editLink: string, 
    lastEditedAt: Date, owner: string, rallyCount: number }[], 
    currentUserId?: string): string {
  if (items.length === 0) {
    return "";
  }

  return `
  <style>
    table {
      border-collapse: collapse;
      margin: 20px;
    }

    table, th, td {
      border: 1px solid;
    }
    td {
      padding: 10px;
    }
    .delete-project {
      background-color: #ee4444;
      color: white;
      border: none;
      padding: 5px 10px;
      cursor: pointer;
      border-radius: 3px;
    }
  </style>
  <table>
    <thead>
      <tr>
        <th>Match-up</th>
        <th>Rallies</th>
        ${currentUserId ? '<th>Edited on</th>' : ''}
        ${currentUserId ? '<th>Actions</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${items.map(({ id, text, matchUpLink, editLink, lastEditedAt, owner, rallyCount }) => `
        <tr>
          <td><a href="${matchUpLink}">${text}</a></td>
          <td>${rallyCount}</td>
          ${currentUserId && owner === currentUserId ? `
            <td><a href="${editLink}">${formatDate(lastEditedAt)}</a></td>
            <td><button data-project-id="${id}" class="delete-project">X</button></td>
          ` : ''}
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options); 
}

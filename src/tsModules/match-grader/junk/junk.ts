
//   async loadOrCreateProject(id: string) {
//     const json = await dao.get(id);
//     this.project = new GradebookProject();
//     this.project.projectInfo.id = id;
//     let finalProjectId = id;
//     if (json) {
//       this.project = GradebookProject.deserialize(json);
//     } else {
//       // TODO add this back if we ever run into race condition saving a new project.
// const info = this.project.projectInfo;
    // info.owner = auth.currentUser.uid;
    // info.ownerEmail = auth.currentUser.email || '';
//       const projectJson = this.project.toJson();
//       try {
//         await dao.set(id, projectJson);
//       } catch (err) {
//         finalProjectId = await dao.add(projectJson);
//       }
//     }
//     return finalProjectId;
//   }
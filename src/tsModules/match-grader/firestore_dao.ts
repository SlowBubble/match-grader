// Import the functions you need from the SDKs you need
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { app } from "../firebase/config";
import { collection, doc, setDoc, getDoc, addDoc, getDocs } from "firebase/firestore"; 

// TODO use a different collection for prod (e.g. prod-clips)
export const devCollName = 'clips';

// const analytics = getAnalytics(app);
const db = getFirestore(app);


export class FirestoreDao {
  constructor(public collectionName = devCollName) {}

  async getAll() {
    const coll = collection(db, this.collectionName);
    // TODO restrict to shared and owner's docs.
    const querySnapshot = await getDocs(coll);
    const docs: any[] = [];

    querySnapshot.forEach((doc) => {
      docs.push(doc.data()); 
    });
    return docs;
  }

  async get(id: string) {
    const coll = collection(db, this.collectionName);
    const docRef = doc(coll, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    console.warn('Unable to find doc: ', id);
  }

  async set(id: string, docData: any) {
    const coll = collection(db, this.collectionName);
    await setDoc(doc(coll, id), docData);
  }

  async add(docData: any) {
    const coll = collection(db, this.collectionName);
    const docRef = await addDoc(coll, docData);
    return docRef.id;
  }
}

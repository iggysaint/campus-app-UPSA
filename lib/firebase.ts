import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6aGidHQEMrLrVCbWagEZorSbrLN3AWUI",
  authDomain: "campus-app-9a1bf.firebaseapp.com",
  projectId: "campus-app-9a1bf",
  storageBucket: "campus-app-9a1bf.firebasestorage.app",
  messagingSenderId: "163964736987",
  appId: "1:163964736987:web:87e736296b01deb2f743fe"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
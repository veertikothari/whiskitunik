import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDe5uNK-jFtesqageH6JPwfiEEAVgTaP3s",
  authDomain: "unikwhiskit-490a8.firebaseapp.com",
  projectId: "unikwhiskit-490a8",
  storageBucket: "unikwhiskit-490a8.firebasestorage.app",
  messagingSenderId: "523009332530",
  appId: "1:523009332530:web:c561956009cdbcf424332b",
  measurementId: "G-7YBEG5T279"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBq9U2FzRosm31fTZ79FFIPaYh0vRfnryo",
  authDomain: "rizemail-1f7ec.firebaseapp.com",
  databaseURL: "https://rizemail-1f7ec-default-rtdb.firebaseio.com",
  projectId: "rizemail-1f7ec",
  storageBucket: "rizemail-1f7ec.appspot.com",
  messagingSenderId: "986769287763",
  appId: "1:986769287763:web:863c726de8c9ad45b6b4a6",
  measurementId: "G-3Z050XGTGS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app)

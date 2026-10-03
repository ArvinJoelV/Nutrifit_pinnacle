// Import the functions you need from the SDKs you need

import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBszHfZC49C0P4Jjk3ZfQWiyer_VOfQI44",
  authDomain: "nutrifit-4304d.firebaseapp.com",
  projectId: "nutrifit-4304d",
  storageBucket: "nutrifit-4304d.firebasestorage.app",
  messagingSenderId: "833184429643",
  appId: "1:833184429643:web:426bbb026144c3b321bfce",
  measurementId: "G-JJGJGTSGR6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, db, googleProvider };
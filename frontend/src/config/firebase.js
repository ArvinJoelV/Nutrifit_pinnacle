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
  apiKey: "AIzaSyBy4PFRrsA7fh-s1dKj6uiH5FzuRS0OIf4",
  authDomain: "nutrifit-6926a.firebaseapp.com",
  projectId: "nutrifit-6926a",
  storageBucket: "nutrifit-6926a.firebasestorage.app",
  messagingSenderId: "880728362149",
  appId: "1:880728362149:web:d7a78ad62a4bec68f7114c",
  measurementId: "G-6LXJFHX5G3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
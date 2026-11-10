import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  reload,
} from 'firebase/auth'

/**
 * Firebase Project Configuration
 * Read strictly from Vite environment variables.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    (env.VITE_FIREBASE_PROJECT_ID ? `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : undefined),
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    (env.VITE_FIREBASE_PROJECT_ID ? `${env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app` : undefined),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/**
 * Checks whether all required Firebase credentials are configured in .env
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

/**
 * Initialize Firebase App and Auth instances safely
 */
let app = null
let auth = null

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
    auth = getAuth(app)
  } catch (initErr) {
    console.error('Firebase initialization error:', initErr)
  }
}

export { app, auth }

/**
 * Translates Firebase Auth error codes into human-readable messages
 * @param {object} error - The Firebase error object
 * @returns {string} User-friendly error message
 */
export const getReadableAuthErrorMessage = (error) => {
  if (!error) return 'An unknown authentication error occurred.'

  const code = error.code || ''

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid or poorly formatted.'
    case 'auth/user-disabled':
      return 'This user account has been disabled. Contact system administrator.'
    case 'auth/user-not-found':
      return 'No CNCGuard account found with this email address.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials.'
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.'
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connectivity.'
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to too many failed attempts. Try again later.'
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is not enabled in Firebase Console.'
    default:
      return error.message || 'An error occurred during authentication.'
  }
}

/**
 * Register a new operator/engineer account and set display name
 * @param {string} email
 * @param {string} password
 * @param {string} [fullName]
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const registerUser = async (email, password, fullName) => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase configuration is missing. Please set credentials in the .env file.')
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    if (fullName && fullName.trim()) {
      await updateProfile(userCredential.user, {
        displayName: fullName.trim(),
      })
      try {
        await reload(userCredential.user)
      } catch {
        // Non-fatal if immediate reload fails
      }
    }
    return userCredential
  } catch (error) {
    const message = getReadableAuthErrorMessage(error)
    const enhancedError = new Error(message)
    enhancedError.code = error.code
    enhancedError.originalError = error
    throw enhancedError
  }
}

/**
 * Sign in an operator/engineer with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const loginUser = async (email, password) => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase configuration is missing. Please set credentials in the .env file.')
  }

  try {
    return await signInWithEmailAndPassword(auth, email, password)
  } catch (error) {
    const message = getReadableAuthErrorMessage(error)
    const enhancedError = new Error(message)
    enhancedError.code = error.code
    enhancedError.originalError = error
    throw enhancedError
  }
}

/**
 * Sign out current operator/engineer
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase configuration is missing. Please set credentials in the .env file.')
  }

  try {
    return await signOut(auth)
  } catch (error) {
    const message = getReadableAuthErrorMessage(error)
    const enhancedError = new Error(message)
    enhancedError.code = error.code
    enhancedError.originalError = error
    throw enhancedError
  }
}

/**
 * Subscribe to Firebase authentication state changes
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export const subscribeToAuthChanges = (callback) => {
  if (!isFirebaseConfigured || !auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

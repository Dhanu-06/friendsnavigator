# Emulator Usage

This document explains how to use the local Firebase emulator suite for development.

## Commands

- `npm run emulators`: Starts the Firebase emulators for Auth, Firestore, and the Emulator UI. It will import data from `./emulator-export` on start and export data on exit.

- `npm run dev`: Starts the Next.js development server. When the `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` environment variable is set (which it is by default in the `dev` script), the app will automatically connect to the local emulators.

## Notes

- Before deploying your application to production, you should add and test Firestore security rules.

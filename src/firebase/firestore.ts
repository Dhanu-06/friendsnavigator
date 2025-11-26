// src/firebase/firestore.ts
// Compatibility wrapper — export storeAdapter functions so other code can keep importing from this path if needed.

import { getTrip, saveTrip, joinTrip as joinTripLocalOrRemote } from "@/lib/storeAdapter";

export { getTrip, saveTrip, joinTripLocalOrRemote };

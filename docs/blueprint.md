# **App Name**: Tripmate

## Core Features:

- Sign-up and Group Creation: Users can sign up and create/join groups using a link/code.
- Live Map: Display a live map showing the location of group members with last update time using Google Maps API or Mapbox.
- Location Sharing: Share real-time location while the app is open using browser geolocation.
- ETA Calculation: Estimate time of arrival (ETA) to the destination using the Directions API or a straight-line ETA stub.
- Trip Type Toggle: Toggle between Within City and Out of City trip types to change UI/behavior.
- AI Meeting Point Suggestion: Suggest a simple meeting point based on centroid/K-means clustering with a Google Places integration. Uses an AI tool to decide when and if to incorporate places API results
- Alerts: Generate alerts for delays (no location update for X seconds) and route deviations (distance exceeding a threshold).
- Group Chat: Implement a basic group chat feature for text communication.

## Style Guidelines:

- Primary color: #3B82F6 (Strong Blue) to evoke feelings of trust, reliability, and forward movement, aligning with the application's core purpose of coordinating trips.
- Background color: #EBF4FF (Light Blue), a desaturated version of the primary, for a calm and clean backdrop.
- Accent color: #4ade80 (Lime Green), to signal actions, confirmation and important notifications.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use map-related icons and location-based symbols for easy navigation.
- Subtle animations for map updates and user interactions.
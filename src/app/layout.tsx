// src/app/layout.tsx
export const metadata = {
  title: "FriendsNavigator — Debug",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial" }}>
        {children}
      </body>
    </html>
  );
}

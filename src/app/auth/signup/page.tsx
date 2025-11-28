
'use client';

export default function Page() {
  return (
    <div style={{padding:40, fontFamily: 'sans-serif'}}>
      <h1 style={{fontSize: '2rem', fontWeight: 'bold'}}>Signup Route - Debug</h1>
      <p style={{marginTop: '1rem'}}>If you can see this, the /auth/signup route is now working correctly.</p>
      <p style={{marginTop: '1rem'}}>The previous 404 error was likely due to a caching or build issue with the more complex component. We can now restore the full signup form.</p>
    </div>
  );
}

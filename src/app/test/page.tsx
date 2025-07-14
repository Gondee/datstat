export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Test Page</h1>
      <p>If you can see this, the Next.js app is working!</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
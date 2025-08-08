export default function Explainer() {
  return (
    <div className="explainer-container">
      <header className="hero-section">
        <h1>Secure Key Backup and Recovery</h1>
        <p className="subtitle">Professional-grade cryptographic key management using Shamir's Secret Sharing</p>
      </header>

      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔐</div>
          <h3>Browser-Based Security</h3>
          <p>Uses your browser's built-in crypto module for secure random key generation. No data leaves your device.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">🧩</div>
          <h3>Shamir's Secret Sharing</h3>
          <p>Split your key into multiple shares with customizable threshold requirements for recovery.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">📄</div>
          <h3>Paper Wallet QR Codes</h3>
          <p>Generate printable QR codes for offline storage. Distribute shares across trusted parties or secure locations.</p>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Generate</h4>
              <p>Create a cryptographically secure random key using your browser's crypto API</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Split</h4>
              <p>Divide the key into multiple shares using Shamir's Secret Sharing Scheme</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Secure</h4>
              <p>Print QR codes and distribute shares to trusted parties or secure locations</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Recover</h4>
              <p>Combine the minimum threshold of shares to reconstruct your original key</p>
            </div>
          </div>
        </div>
      </section>

      <section className="security-notice">
        <div className="notice-card">
          <h3>🛡️ Security First</h3>
          <p>This application runs entirely in your browser. Your keys and shares never leave your device unless you explicitly save or print them. Always verify the integrity of your shares before relying on them for key recovery.</p>
        </div>
      </section>
    </div>
  );
}
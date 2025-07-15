export default function Explainer() {
  return (
    <>
        <h1>Secure Key Backup and Recovery</h1>
        <h2>In browser random key generation, splitting, and recombination.</h2>
        <div className="explainer">
        <h3>How it works</h3>
        <p>This app relies on the crypto module built into browsers to derive a random key. It then splits that key into shares using Shamir's Secret Sharing Scheme. You can control the number of total shares and the threshold which defines how many shares are required to later recover the original key. You can save the shares as QR codes printed out on paper, sharing each page with a different trusted party or putting them in different secure locations. This way you can recover the funds later even if some of the shares are lost or destroyed.</p>
        </div>
    </>
  );
}
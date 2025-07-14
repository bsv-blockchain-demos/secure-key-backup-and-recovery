import { useState } from 'react';
import { PrivateKey } from '@bsv/sdk';
import { Html5Qrcode } from 'html5-qrcode';

function Recover() {
  const [shares, setShares] = useState([]);
  const [recoveredKey, setRecoveredKey] = useState(null);
  const [pubKeyQrRef, setPubKeyQrRef] = useState(null);
  const [addressQrRef, setAddressQrRef] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [pasteInput, setPasteInput] = useState('');

  const startScanner = () => {
    const html5QrCode = new Html5Qrcode('reader');
    setScanning(true);
    html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        setShares((prev) => [...prev, decodedText]);
        html5QrCode.stop();
        setScanning(false);
      },
      (errorMessage) => {
        console.warn(errorMessage);
      }
    );
  };

  const addPastedShare = () => {
    if (pasteInput) {
      setShares((prev) => [...prev, pasteInput]);
      setPasteInput('');
    }
  };

  const recoverKey = () => {
    if (shares.length >= 2) { // Assuming minimum 2 for recovery
      const key = PrivateKey.fromBackupShares(shares);
      setPubKeyQrRef(key.toPublicKey().toString());
      setAddressQrRef(key.toAddress());
      setRecoveredKey(key.toWif());
    } else {
      alert('Need at least the threshold number of shares to recover.');
    }
  };

  return (
    <div>
      <h1>Recover Key</h1>
      <button onClick={startScanner} disabled={scanning}>Scan QR Code</button>
      <div id="reader" style={{ width: '100%' }}></div>
      <input
        type="text"
        value={pasteInput}
        onChange={(e) => setPasteInput(e.target.value)}
        placeholder="Paste share here"
      />
      <button onClick={addPastedShare}>Add Pasted Share</button>
      <h2>Collected Shares: {shares.length}</h2>
      <button onClick={recoverKey}>Recover Key</button>
      {recoveredKey && (
        <div>
          <h2>Recovered Private Key</h2>
          <p>{recoveredKey}</p> {/* Display as WIF or appropriate format */}
          <h2>PublicKey</h2>
          <p>{pubKeyQrRef}</p>
          <h2>Address</h2>
          <p>{addressQrRef}</p>
        </div>
      )}
    </div>
  );
}

export default Recover;

import React, { useState, useRef, useCallback } from 'react';
import PageCard from './PageCard';
import { PieChart, Pie, Cell } from 'recharts';
import { PrivateKey } from '@bsv/sdk';
import { QRCodeCanvas } from 'qrcode.react';

import jsPDF from 'jspdf';
import { P2PKH } from '@bsv/sdk';

function Backup({ wallet }) {
  const [threshold, setThreshold] = useState(2);
  const [totalShares, setTotalShares] = useState(3);
  const [privateKey, setPrivateKey] = useState(null);
  const [shares, setShares] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bsvAmount, setBsvAmount] = useState('0');
  const [txid, setTxid] = useState(null);
  const [filenamePrefix, setFilenamePrefix] = useState(null);
  const qrRefs = useRef([]);
  const pubKeyQrRef = useRef(null);
  const addressQrRef = useRef(null);

  const generateKeyAndShares = () => {
    const key = PrivateKey.fromRandom();
    setPrivateKey(key);
    const backupShares = key.toBackupShares(threshold, totalShares);
    setShares(backupShares);
    setGenerated(true);
  };

  const shareData = Array.from({length: totalShares}, (_, index) => ({
    name: `Share ${index + 1}`,
    value: 1
  }));

  const saveAsPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    const filenamePrefix = `${date}-${time}`;
    setFilenamePrefix(filenamePrefix);
    shares.forEach((share, index) => {
      if (index > 0) {
        doc.addPage();
      }
      doc.setFontSize(12);
      doc.text(`Share ${index + 1} of ${totalShares}`, 10, 10);
      doc.text(filenamePrefix, 160, 10);
      if (qrRefs.current[index]) {
        doc.addImage(qrRefs.current[index].toDataURL('image/png'), 'PNG', 10, 20, 50, 50);
      }
      doc.setFontSize(8);
      doc.text(share, 10, 80);
      doc.setFontSize(12);

      // Always repeat the public details on each page
      doc.text('PublicKey', 10, 100);
      if (pubKeyQrRef.current) {
        doc.addImage(pubKeyQrRef.current.toDataURL('image/png'), 'PNG', 10, 110, 50, 50);
      }
      doc.setFontSize(8);
      doc.text(privateKey.toPublicKey().toString(), 10, 170);
      doc.setFontSize(12);
      doc.text('Address', 10, 190);
      if (addressQrRef.current) {
        doc.addImage(addressQrRef.current.toDataURL('image/png'), 'PNG', 10, 200, 50, 50);
      }
      doc.setFontSize(8);
      doc.text(privateKey.toAddress(), 10, 260);
    });

    doc.save(`${filenamePrefix}-backup-shares.pdf`);
  };


  const makePayment = useCallback(async (amount) => {
    try {
      if (!privateKey) {
        alert('No private key generated yet.');
        return;
      }
      const to = privateKey.toAddress();
      await wallet.isAuthenticated();
      const { network } = await wallet.getNetwork();
      // Very naive network vs. address check for demo:
      if (network === 'mainnet' && !to.startsWith('1')) {
          alert('You are on mainnet but the recipient address does not look like a mainnet address (starting with 1)!');
          return;
      }

      const lockingScript = new P2PKH().lock(to).toHex();
      const { txid } = await wallet.createAction({
          description: `Lock BSV into address associated with ${filenamePrefix}-backup-shares.pdf`,
          outputs: [
              {
                  lockingScript,
                  satoshis: Math.round(amount * 100000000),
                  outputDescription: `SSSS secured BSV Savings`,
                  basket: 'bsv-savings',
                  labels: ['bsv-savings', 'shamir-secret-sharing', 'backup-shares'],
                  customInstructions: `Unlock using shares from ${filenamePrefix}-backup-shares.pdf`,
              },
          ],
      });
      
      setTxid(txid);
    } catch (error) {
      console.error('Error making payment:', error);
    }
  }, [privateKey, filenamePrefix]);

  const renderInitialState = () => (
    <div className="form-container text-center">
      <p className="page-description">Configure how many backup shares to create and how many are needed for recovery.</p>
      <div className="share-config-container">
        <div className="fieldset">
          <label htmlFor="threshold">Required Shares (Threshold)</label>
          <input
            id="threshold"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Math.max(2, Number(e.target.value)))}
            min={2}
            max={totalShares - 1}
            className="input-text"
          />
        </div>
        <div className="fieldset">
          <label htmlFor="totalShares">Total Shares to Create</label>
          <input
            id="totalShares"
            type="number"
            value={totalShares}
            onChange={(e) => setTotalShares(Math.max(threshold + 1, Number(e.target.value)))}
            min={threshold + 1}
            max={20}
            className="input-text"
          />
        </div>
      </div>
      <div className="share-chart-container">
        <h3>Share Distribution</h3>
        <PieChart width={300} height={300}>
          <Pie data={shareData} cx={150} cy={150} labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" stroke="var(--paper-white)" strokeWidth={3}>
            {shareData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index < threshold ? 'var(--forest-green)' : 'var(--warm-brown)'} />
            ))}
          </Pie>
        </PieChart>
        <div className="chart-legend">
          <span><i style={{ backgroundColor: 'var(--forest-green)' }}></i> Required ({threshold})</span>
          <span><i style={{ backgroundColor: 'var(--warm-brown)' }}></i> Additional ({totalShares - threshold})</span>
        </div>
      </div>
      <button onClick={generateKeyAndShares} className="button button-primary button-large">Generate Backup Shares</button>
    </div>
  );

  const renderGeneratedState = () => (
    <div className="form-container text-center">
      <h3>Backup Shares Generated</h3>
      <p className="page-description">Your key is now split into {totalShares} shares. You need any {threshold} to recover it. Save the PDF and store each share separately.</p>
      <button className="button button-secondary" onClick={saveAsPDF}>📄 Save as PDF</button>
      <div className="qr-code-grid">
        {shares.map((share, index) => (
          <div key={index} className="qr-code-item">
            <h4>Share {index + 1} of {totalShares}</h4>
            <QRCodeCanvas value={share} ref={(el) => (qrRefs.current[index] = el)} size={180} />
            <p className={`share-label ${index < threshold ? 'required' : 'additional'}`}>
              {index < threshold ? 'Required' : 'Additional'}
            </p>
          </div>
        ))}
      </div>
      <div className="warning-message">
        ⚠️ <strong>Critical:</strong> Store each share in a different, secure location. Anyone with {threshold} or more shares can access your funds.
      </div>
      <button className="button button-confirm" onClick={() => setConfirmed(true)}>✓ I have securely stored the backup</button>
    </div>
  );

  const renderConfirmedState = () => (
    <div className="form-container text-center">
      <h3>🎉 Backup Confirmed & Wallet Ready!</h3>
      <p className="page-description">Your new secure wallet is ready. Use the address below to receive funds.</p>
      
      <div className="fieldset">
        <label>Wallet Address</label>
        <div className="address-display">
          <a href={`https://whatsonchain.com/address/${privateKey.toAddress()}`} target="_blank" rel="noopener noreferrer">
            {privateKey.toAddress()}
          </a>
        </div>
      </div>

      <div className="fieldset">
        <label>Public Key</label>
        <input type="text" value={privateKey.toPublicKey().toString()} readOnly className="input-text monospace-font" />
      </div>

      <div className="divider-or"><span>💰</span></div>

      <h4>Fund Your Wallet</h4>
      <p className="page-description">Send BSV to your new address to complete the process.</p>

      <div className="fieldset amount-fieldset">
        <label htmlFor="bsvAmount">Amount to Send</label>
        <div className="amount-input-wrapper">
          <input id="bsvAmount" type="number" value={bsvAmount} onChange={(e) => setBsvAmount(e.target.value)} placeholder="0.01" min="0.00000001" step="0.00000001" className="input-text" />
          <span>BSV</span>
        </div>
      </div>

      <button onClick={() => makePayment(Number(bsvAmount))} disabled={!bsvAmount || Number(bsvAmount) <= 0} className="button button-primary button-large">
        🚀 Send from Wallet
      </button>

      {txid && (
        <div className="success-message" style={{ marginTop: '1.5rem' }}>
          <strong>✅ Transaction Sent!</strong>
          <a href={`https://whatsonchain.com/tx/${txid}`} target="_blank" rel="noopener noreferrer">View on Explorer</a>
        </div>
      )}
    </div>
  );

  return (
    <PageCard title="Create a New Backup">
      {!generated && renderInitialState()}
      {generated && !confirmed && renderGeneratedState()}
      {generated && confirmed && renderConfirmedState()}
    </PageCard>
  );
}

export default Backup;

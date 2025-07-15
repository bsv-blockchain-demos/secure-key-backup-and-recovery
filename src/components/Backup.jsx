import { useState, useRef } from 'react';
import { PrivateKey } from '@bsv/sdk';
import { QRCodeCanvas } from 'qrcode.react';
import { PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import { P2PKH } from '@bsv/sdk';
import React, { useCallback } from 'react';

const COLORS = ['#b3525d', '#30a6f5'];

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

  return (
    <div>
      <h2>Key Splitting & Backup</h2>
      {(!generated) && <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="threshold">Threshold:</label>
            <input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value)))}
              min={2}
              max={totalShares - 1}
              style={{ width: '100px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="totalShares">Total Shares:</label>
            <input
              id="totalShares"
              type="number"
              value={totalShares}
              onChange={(e) => setTotalShares(Math.min(20, Math.max(threshold + 1, parseInt(e.target.value) || (threshold + 1))))}
              min={threshold + 1}
              max={20}
              style={{ width: '100px' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', marginTop: '20px' }}>
          <PieChart width={300} height={300} style={{ maxWidth: '100%' }}>
            <Pie
              data={shareData}
              cx={150}
              cy={150}
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              stroke="#000"
              strokeWidth={1}
            >
              {shareData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index < threshold ? COLORS[0] : COLORS[1]} />
              ))}
            </Pie>
          </PieChart>
        </div>
        <button onClick={generateKeyAndShares}>Generate Backup Shares</button>
      </>}
      {generated && <>
        <div>
          {!confirmed && (
            <>
              <h3>Backup Shares</h3>
              <button className={'positive'} onClick={saveAsPDF}>Save as PDF</button>
              <br />
              <div className="shares-container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
                {shares.map((share, index) => (
                  <div key={index} style={{ margin: '10px', textAlign: 'center', maxWidth: '100%' }}>
                    <h3>Share {index + 1}</h3>
                    <QRCodeCanvas
                      value={share}
                      ref={(el) => (qrRefs.current[index] = el)}
                      size={Math.min(200, window.innerWidth > 400 ? 200 : window.innerWidth - 100)}
                    />
                  </div>
                ))}
              </div>
              <br />
              <button className={'critical'} onClick={() => setConfirmed(true)}>I have backed up the key</button>
            </>
          )}
        </div>
        <div style={{ display: confirmed ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', padding: '15px', paddingBottom: '60px', maxWidth: '100%' }}>
          <h3>PublicKey</h3>
          <QRCodeCanvas value={privateKey.toPublicKey().toString()} ref={pubKeyQrRef} style={{ marginBottom: '5px' }} />
          <input type="text" value={privateKey.toPublicKey().toString()} readOnly style={{ width: '100%', maxWidth: '300px', overflowX: 'auto', fontSize: '0.8em' }} />
          <br />
          <h3>Address</h3>
          <QRCodeCanvas value={privateKey.toAddress()} ref={addressQrRef} style={{ marginBottom: '5px' }} />
          <input type="text" value={privateKey.toAddress()} readOnly style={{ width: '100%', maxWidth: '300px', fontSize: '0.9em' }} />
          <a href={`https://whatsonchain.com/address/${privateKey.toAddress()}`} target="_blank" rel="noopener noreferrer">Explorer</a>
          <br />
        </div>
        </>}

        {(generated && confirmed) && <>
          <h2>Transfer Funds</h2>
          <div className='amountInput' style={{ margin: '10px auto' }}>
            <input
              type="number" 
              value={bsvAmount} 
              onChange={(e) => setBsvAmount(e.target.value)} 
              placeholder="0.100000000"
              min="0.00000001"
              max="21000000"
              step="0.00000001"
              style={{ marginBottom: '20px', width: '140px', fontSize: '16px' }} 
            />
            <span>BSV</span>
          </div>
          <br />
          <br />
          <button onClick={() => makePayment(Number(bsvAmount))} style={{ width: '200px' }}>Pay Address</button>
          {txid && (
            <p>Success: <a href={`https://whatsonchain.com/tx/${txid}`} target="_blank" rel="noopener noreferrer">{txid}</a></p>
          )}
        </>}
        <div style={{ height: '100px' }} />
    </div>
  );
}

export default Backup;

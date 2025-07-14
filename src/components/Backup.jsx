import { useState, useRef } from 'react';
import { PrivateKey } from '@bsv/sdk';
import { QRCodeCanvas } from 'qrcode.react';
import { PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';

const COLORS = ['#0088FE', '#FFBB28'];

function Backup() {
  const [threshold, setThreshold] = useState(2);
  const [totalShares, setTotalShares] = useState(3);
  const [privateKey, setPrivateKey] = useState(null);
  const [shares, setShares] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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
    shares.forEach((share, index) => {
      if (index > 0) {
        doc.addPage();
      }
      doc.setFontSize(12);
      doc.text(`Share ${index + 1} of ${totalShares}`, 10, 10);
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
    
    doc.save('backup-shares.pdf');
  };

  return (
    <div>
      <h1>Key Backup</h1>
      <label>
        Threshold:
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value)))}
          min="1"
          max={totalShares - 1}
        />
      </label>
      <label>
        Total Shares:
        <input
          type="number"
          value={totalShares}
          onChange={(e) => setTotalShares(Math.max(threshold + 1, parseInt(e.target.value)))}
          min={threshold + 1}
        />
      </label>
      <PieChart width={400} height={400}>
        <Pie
          data={shareData}
          cx={200}
          cy={200}
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
      <button onClick={generateKeyAndShares}>Generate Key and Shares</button>
      {generated && (
        <div>
          <h2>Backup Shares</h2>
          {shares.map((share, index) => (
            <div key={index}>
              <h3>Share {index + 1}</h3>
              <QRCodeCanvas
                value={share}
                ref={(el) => (qrRefs.current[index] = el)}
              />
            </div>
          ))}
          <button onClick={saveAsPDF}>Save as PDF</button>
          {!confirmed && (
            <button onClick={() => setConfirmed(true)}>I have backed up the key</button>
          )}
        </div>
      )}
      {generated && (
        <div style={{display: confirmed ? 'block' : 'none'}}>
          <h2>PublicKey</h2>
          <p>{privateKey.toPublicKey().toString()}</p>
          <QRCodeCanvas value={privateKey.toPublicKey().toString()} ref={pubKeyQrRef} />
          <h2>Address</h2>
          <p>{privateKey.toAddress()}</p>
          <QRCodeCanvas value={privateKey.toAddress()} ref={addressQrRef} />
        </div>
      )}
    </div>
  );
}

export default Backup;

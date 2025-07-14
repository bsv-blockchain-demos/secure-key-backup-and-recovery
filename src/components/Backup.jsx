import { useState, useRef } from 'react';
import { PrivateKey } from '@bsv/sdk';
import { QRCodeCanvas } from 'qrcode.react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';

const COLORS = ['#0088FE', '#FFBB28'];

function Backup() {
  const [threshold, setThreshold] = useState(2);
  const [totalShares, setTotalShares] = useState(3);
  const [privateKey, setPrivateKey] = useState(null);
  const [shares, setShares] = useState([]);
  const [generated, setGenerated] = useState(false);
  const qrRefs = useRef([]);


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
    doc.text(`Share ${index + 1}`, 10, 10);
    if (qrRefs.current[index]) {
      doc.addImage(qrRefs.current[index].toDataURL('image/png'), 'PNG', 10, 15, 50, 50);
    }
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
        </div>
      )}
    </div>
  );
}

export default Backup;

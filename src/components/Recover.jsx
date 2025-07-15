import { useState, useEffect } from 'react';
import { PrivateKey, Transaction, Beef, P2PKH } from '@bsv/sdk';
import { Html5Qrcode } from 'html5-qrcode';
import { Utils } from '@bsv/sdk';
import React, { useCallback } from 'react';

function Recover({ wallet }) {
  const [shares, setShares] = useState([]);
  const [recoveredKey, setRecoveredKey] = useState(null);
  const [pubKeyQrRef, setPubKeyQrRef] = useState(null);
  const [addressQrRef, setAddressQrRef] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [balance, setBalance] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [recoveredAddress, setRecoveredAddress] = useState(null);

  const getUtxosForAddress = async (address) => {
    const { network } = await wallet.getNetwork();
    const net = network === 'mainnet' ? 'main' : 'test';
    const response = await fetch(`https://api.whatsonchain.com/v1/bsv/${net}/address/${address}/unspent/all`);
    const rp = await response.json();
    const utxos = rp.result.filter(r => r.isSpentInMempoolTx === false).map(r => ({ txid: r.tx_hash, vout: r.tx_pos, satoshis: r.value }));
    return utxos;
  };

  const fetchBSVBalance = async (address) => {
    const utxos = await getUtxosForAddress(address);
    const balance = utxos.reduce((acc, r) => acc + r.satoshis, 0);
    return balance / 100000000;
  };

  const getBeefForTxid = async (txid, net) => {
    const response = await fetch(`https://api.whatsonchain.com/v1/bsv/${net}/tx/${txid}/beef`);
    return await response.text();
  };

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
      setRecoveredAddress(key.toAddress());
    } else {
      alert('Need at least the threshold number of shares to recover.');
    }
  };

  useEffect(() => {
    const updateBalance = async () => {
      if (recoveredAddress) {
        const bal = await fetchBSVBalance(recoveredAddress);
        setBalance(bal);
      }
    };
    updateBalance();
  }, [recoveredAddress]);

  const handleImportFunds = useCallback(async () => {
    if (!recoveredAddress || balance <= 0) {
      alert('Get your address and balance first!');
      return;
    }
    if (balance === 0) {
      alert('No money to import!');
      return;
    }

    const key = PrivateKey.fromWif(recoveredKey);

    setIsImporting(true);

    let reference;
    try {
      const { network } = await wallet.getNetwork();
      const net = network === 'mainnet' ? 'main' : 'test';
      console.log('line 102')
      const utxos = await getUtxosForAddress(recoveredAddress);

      console.log('line 105', utxos)
      const outpoints = utxos.map(x => `${x.txid}.${x.vout}`);
      const inputs = outpoints.map(outpoint => ({
        outpoint,
        inputDescription: 'Redeem from the Legacy Bridge',
        unlockingScriptLength: 108,
      }));
      console.log('line 112', inputs)

      const inputBEEF = new Beef();
      for (let i = 0; i < inputs.length; i++) {
        const txid = inputs[i].outpoint.split('.')[0];
        console.log('line 116', txid)
        if (!inputBEEF.findTxid(txid)) {
          const beef = await getBeefForTxid(txid, net);
          inputBEEF.mergeBeef(Utils.toArray(beef, 'hex'));
        }
      }
      console.log('line 123', inputBEEF)
      const { signableTransaction } = await wallet.createAction({
        inputBEEF: inputBEEF.toBinary(),
        inputs,
        description: 'Import from the Legacy Bridge',
      });
      console.log('line 129', signableTransaction)
      reference = signableTransaction.reference;

      const tx = Transaction.fromAtomicBEEF(signableTransaction.tx);
      const importer = new P2PKH();
      const unlocker = importer.unlock(key);

      const signActionArgs = {
        reference,
        spends: {},
      };

      for (let i = 0; i < inputs.length; i++) {
        const script = await unlocker.sign(tx, i);
        signActionArgs.spends[i] = {
          unlockingScript: script.toHex(),
        };
      }
      console.log('line 146', signActionArgs)
      await wallet.signAction(signActionArgs);

      setBalance(0);
      alert('Funds successfully imported to your local wallet!');
    } catch (e) {
      console.error(e);
      if (reference) {
        await wallet.abortAction({ reference });
      }
      const message = `Import failed: ${e.message || 'unknown error'}`;
      alert(message);
    } finally {
      setIsImporting(false);
    }
  }, [wallet, recoveredKey, recoveredAddress, balance]);

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
          <p>{recoveredKey}</p>
          <h2>PublicKey</h2>
          <p>{pubKeyQrRef}</p>
          <h2>Address</h2>
          <p><a href={`https://whatsonchain.com/address/${addressQrRef}`} target="_blank" rel="noopener noreferrer">{addressQrRef}</a></p>
          <h2>Balance</h2>
          <p>{balance} BSV</p>
          <button onClick={handleImportFunds} disabled={isImporting || balance === 0}>
            {isImporting ? 'Importing...' : 'Import Funds'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Recover;

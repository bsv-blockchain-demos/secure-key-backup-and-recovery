import { useState, useEffect } from 'react';
import { PrivateKey, Transaction, Beef, P2PKH } from '@bsv/sdk';
import { Html5Qrcode } from 'html5-qrcode';
import { Utils } from '@bsv/sdk';
import React, { useCallback } from 'react';

function Recover({ wallet }) {
  const [shares, setShares] = useState([]);
  const [threshold, setThreshold] = useState(0);
  const [integrity, setIntegrity] = useState();
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
        html5QrCode.stop();
        setScanning(false);
        addIfValid(decodedText);
      },
      (errorMessage) => {
        console.warn(errorMessage);
      }
    );
  };

  const addIfValid = (input) => {
    const [x, y, t, i] = input.split('.');
    if (!!threshold && threshold !== Number(t)) {
      alert('Threshold does not match!');
      return;
    } else {
      setThreshold(Number(t));
    }
    if (!!integrity && integrity !== i) {
      alert('Integrity does not match!');
      return;
    } else {
      setIntegrity(i);
    }
    setShares((prev) => {
      const newShares = [...prev, input];
      if (newShares.length === threshold) {
        recoverKey(newShares);
      }
      return newShares;
    });
  };

  const addPastedShare = () => {
    if (pasteInput) {
      setPasteInput('');
      addIfValid(pasteInput);
    }
  };

  const recoverKey = (shares) => {
      const key = PrivateKey.fromBackupShares(shares);
      setPubKeyQrRef(key.toPublicKey().toString());
      setAddressQrRef(key.toAddress());
      setRecoveredKey(key.toWif());
      setRecoveredAddress(key.toAddress());
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
      <h2>Recover Key</h2>
      {!recoveredKey && <>
        <button onClick={startScanner} disabled={scanning}>Scan QR Code</button>
        <div id="reader" style={{ width: '100%' }}></div>
        <br />
        <br />
        <input
          type="text"
          value={pasteInput}
          onChange={(e) => setPasteInput(e.target.value)}
          placeholder="Paste share here"
        />
        <br />
        <br />
        <button onClick={addPastedShare}>Add Pasted Share</button>
        <br />
        <br />
        <h2>Collected Shares: {shares.length} / {threshold}</h2>
      </>}
      {recoveredKey && (
        <div>
          <h3>Recovered Private Key</h3>
          <input type="text" value={recoveredKey} readOnly />
          <h3>PublicKey</h3>
          <input type="text" value={pubKeyQrRef} readOnly />
          <h3>Address</h3>
          <p><a href={`https://whatsonchain.com/address/${addressQrRef}`} target="_blank" rel="noopener noreferrer">{addressQrRef}</a></p>
          <h3>Balance</h3>
          <p>{balance} BSV</p>
          <button onClick={handleImportFunds} disabled={isImporting || balance === 0}>
            {isImporting ? 'Importing...' : 'Import Funds'}
          </button>
        </div>
      )}
      <div style={{ height: '100px' }} />
    </div>
  );
}

export default Recover;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageCard from './PageCard'; // Import the new component
import { PrivateKey, Transaction, Beef, P2PKH } from '@bsv/sdk';
import { Html5Qrcode } from 'html5-qrcode';
import { Utils } from '@bsv/sdk';

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
  const scannerRef = useRef(null);

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

  const startScanner = async () => {
    try {
      // Reuse existing instance if present; otherwise create a new one
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('reader');
      }
      setScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            // Stop and clear cleanly after a successful scan
            if (scannerRef.current) {
              await scannerRef.current.stop().catch(() => {});
              await scannerRef.current.clear().catch(() => {});
            }
          } finally {
            setScanning(false);
            addIfValid(decodedText);
          }
        },
        (errorMessage) => {
          // Normal per-frame scan failure; keep silent or log at low level
          // console.debug('QR scan frame error:', errorMessage);
        }
      );
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      // Ensure UI state is reset on failure (e.g., denied camera permission or user cancels prompt)
      setScanning(false);
      try {
        if (scannerRef.current) {
          await scannerRef.current.stop().catch(() => {});
          await scannerRef.current.clear().catch(() => {});
        }
      } catch (_) {
        // no-op
      }
      alert('Unable to start the camera scanner. Please check permissions and try again.');
    }
  };

  const cancelScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        await scannerRef.current.clear().catch(() => {});
      }
    } finally {
      setScanning(false);
    }
  }, []);

  // Cleanup on unmount to avoid dangling camera stream causing crashes/blank screens
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

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
    <PageCard title="Recover Keys from Backup">
      {!recoveredKey ? (
        <div className="form-container">
          <p className="page-description">Scan QR codes from your paper backups or paste the share text manually to reconstruct your private key.</p>
          
          <div className="fieldset text-center">
            {!scanning ? (
              <button onClick={startScanner} className="button button-primary">
                📷 Start QR Scanner
              </button>
            ) : (
              <button onClick={cancelScanner} className="button button-secondary">
                ✖️ Cancel Scan
              </button>
            )}
            <div id="reader" className={`qr-reader ${scanning ? 'active' : ''}`}></div>
          </div>
          
          <div className="divider-or"><span>OR</span></div>

          <div className="fieldset">
            <label htmlFor="pasteShare">Manually Enter Share Text</label>
            <input
              id="pasteShare"
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste a single share here..."
              className="input-text monospace-font"
            />
            <button onClick={addPastedShare} disabled={!pasteInput.trim()} className="button button-secondary">
              ➕ Add Share
            </button>
          </div>

          <div className="share-progress-container">
            <h4>Collection Progress</h4>
            <div className={`progress-text ${shares.length >= threshold ? 'complete' : ''}`}>
              {shares.length} / {threshold || '?'}
            </div>
            <p className="progress-caption">
              {threshold ? 
                (shares.length >= threshold ? 
                  '✅ Sufficient shares collected!' : 
                  `Need ${threshold - shares.length} more share${threshold - shares.length !== 1 ? 's' : ''}`
                ) : 
                'Add shares to determine the required threshold.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="form-container text-center">
          <div className="success-message">
            <strong>🎉 Key Successfully Recovered!</strong>
            <p>Your private key has been reconstructed. You can now view its details and import any associated funds.</p>
          </div>

          <div className="fieldset">
            <label>Recovered Private Key</label>
            <input type="text" value={recoveredKey} readOnly className="input-text monospace-font sensitive-data" />
            <p className="input-caption">⚠️ Keep this private key secure and never share it.</p>
          </div>

          <div className="fieldset">
            <label>Wallet Address</label>
            <div className="address-display">
              <a href={`https://whatsonchain.com/address/${addressQrRef}`} target="_blank" rel="noopener noreferrer">
                {addressQrRef}
              </a>
            </div>
          </div>

          <div className="balance-display">
            <h4>Current Balance</h4>
            <div className={`balance-amount ${balance > 0 ? 'has-funds' : ''}`}>
              {balance} BSV
            </div>
            <p className="balance-caption">
              {balance > 0 ? 'Funds are available to be imported.' : 'No funds found at this address.'}
            </p>
          </div>

          {balance > 0 && (
            <button onClick={handleImportFunds} disabled={isImporting} className="button button-primary button-large">
              {isImporting ? '⏳ Importing Funds...' : '💸 Import All Funds'}
            </button>
          )}
        </div>
      )}
    </PageCard>
  );
}

export default Recover;

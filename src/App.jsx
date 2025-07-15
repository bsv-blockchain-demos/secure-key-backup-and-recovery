import { Routes, Route, Link } from 'react-router-dom';
import Backup from './components/Backup.jsx';
import Recover from './components/Recover.jsx';
import './App.css'
import { WalletClient } from '@bsv/sdk';

function App() {
  const wallet = new WalletClient();
  return (
    <div>
      <nav>
        <Link to="/backup">Backup</Link> | <Link to="/recover">Recover</Link>
      </nav>
      <Routes>
        <Route path="/backup" element={<Backup wallet={wallet} />} />
        <Route path="/recover" element={<Recover wallet={wallet} />} />
      </Routes>
    </div>
  );
}

export default App;

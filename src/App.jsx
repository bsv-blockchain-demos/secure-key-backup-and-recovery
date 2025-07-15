import { Routes, Route, Link } from 'react-router-dom';
import Backup from './components/Backup.jsx';
import Recover from './components/Recover.jsx';
import Explainer from './components/Explainer.jsx';
import { WalletClient } from '@bsv/sdk';
import { useLocation } from 'react-router-dom';

function App() {
  const wallet = new WalletClient();
  const location = useLocation();
  return (
    <div>
      <nav key={location.pathname}>
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>Explainer</Link>
        <Link to="/backup" className={location.pathname === "/backup" ? "active" : ""}>Backup</Link>
        <Link to="/recover" className={location.pathname === "/recover" ? "active" : ""}>Recover</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Explainer />} />
        <Route path="/backup" element={<Backup wallet={wallet} />} />
        <Route path="/recover" element={<Recover wallet={wallet} />} />
      </Routes>
    </div>
  );
}

export default App;

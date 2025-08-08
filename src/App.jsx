import { Routes, Route, Link } from 'react-router-dom';
import Backup from './components/Backup.jsx';
import Recover from './components/Recover.jsx';
import Explainer from './components/Explainer.jsx';
import { WalletClient } from '@bsv/sdk';
import { useLocation } from 'react-router-dom';

function App() {
  const wallet = new WalletClient();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  return (
    <div className="app-container">
      {/* Unified tabbed navigation for all pages */}
      <nav className="home-nav" key={location.pathname}>
        <div className="nav-menu">
          <Link to="/" className={`nav-action ${location.pathname === '/' ? 'active' : ''}`}>?</Link>
          <Link to="/backup" className={`nav-action ${location.pathname === '/backup' ? 'active' : ''}`}>Backup</Link>
          <Link to="/recover" className={`nav-action ${location.pathname === '/recover' ? 'active' : ''}`}>Recover</Link>
        </div>
      </nav>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Explainer />} />
          <Route path="/backup" element={<Backup wallet={wallet} />} />
          <Route path="/recover" element={<Recover wallet={wallet} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

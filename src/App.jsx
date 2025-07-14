import { Routes, Route, Link } from 'react-router-dom';
import Backup from './components/Backup.jsx';
import Recover from './components/Recover.jsx';
import './App.css'

function App() {
  return (
    <div>
      <nav>
        <Link to="/backup">Backup</Link> | <Link to="/recover">Recover</Link>
      </nav>
      <Routes>
        <Route path="/backup" element={<Backup />} />
        <Route path="/recover" element={<Recover />} />
      </Routes>
    </div>
  );
}

export default App;

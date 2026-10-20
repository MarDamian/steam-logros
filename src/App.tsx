import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Data } from '@/routes/Data';
import { Game } from '@/routes/Game';
import { Home } from '@/routes/Home';
import { Library } from '@/routes/Library';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/u/:steamid" element={<Library />} />
        <Route path="/u/:steamid/:appid" element={<Game />} />
        <Route path="/datos" element={<Data />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Topbar from './components/layout/Topbar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import MobileOverlay from './components/layout/MobileOverlay.jsx';
import NotificationStack from './components/shared/NotificationStack.jsx';

import DashboardPanel from './components/panels/DashboardPanel.jsx';
import SqliPanel from './components/panels/SqliPanel.jsx';
import XssPanel from './components/panels/XssPanel.jsx';
import AuthPanel from './components/panels/AuthPanel.jsx';
import AccessPanel from './components/panels/AccessPanel.jsx';
import CsrfPanel from './components/panels/CsrfPanel.jsx';
import CmdPanel from './components/panels/CmdPanel.jsx';
import IdorPanel from './components/panels/IdorPanel.jsx';
import ScannerPanel from './components/panels/ScannerPanel.jsx';
import ReferencePanel from './components/panels/ReferencePanel.jsx';

const PANEL_LIST = [
  ['dashboard', DashboardPanel],
  ['sqli', SqliPanel],
  ['xss', XssPanel],
  ['auth', AuthPanel],
  ['access', AccessPanel],
  ['csrf', CsrfPanel],
  ['cmd', CmdPanel],
  ['idor', IdorPanel],
  ['scanner', ScannerPanel],
  ['reference', ReferencePanel],
];

function AppShell() {
  const { activePanel } = useApp();

  return (
    <>
      <MobileOverlay />
      <div className="app-shell">
        <Topbar />
        <Sidebar />
        <main className="content-area">
          {PANEL_LIST.map(([id, Component]) => (
            <Component key={id} active={activePanel === id} />
          ))}
        </main>
      </div>
      <NotificationStack />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

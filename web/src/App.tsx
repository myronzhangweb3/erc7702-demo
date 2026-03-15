import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WalletProvider, useWallet } from './hooks/useWallet'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Delegation } from './pages/Delegation'
import { MintToken } from './pages/MintToken'
import { Send } from './pages/Send'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useWallet()
  return isConnected ? <>{children}</> : <Navigate to="/" />
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/send" element={<PrivateRoute><Send /></PrivateRoute>} />
        <Route path="/delegation" element={<PrivateRoute><Delegation /></PrivateRoute>} />
        <Route path="/mint" element={<PrivateRoute><MintToken /></PrivateRoute>} />
        {/* Redirects for old bookmarks */}
        <Route path="/send-erc20" element={<Navigate to="/send" replace />} />
        <Route path="/send-native" element={<Navigate to="/send" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <AppRoutes />
      </WalletProvider>
    </BrowserRouter>
  )
}

export default App

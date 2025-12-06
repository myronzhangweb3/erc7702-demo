import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WalletProvider, useWallet } from './hooks/useWallet'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Delegation } from './pages/Delegation'
import { MintToken } from './pages/MintToken'
import { SendERC20 } from './pages/SendERC20'
import { SendNative } from './pages/SendNative'

// 需要登录才能访问的路由包装器
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useWallet()
  return isConnected ? <>{children}</> : <Navigate to="/" />
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/delegation"
          element={
            <PrivateRoute>
              <Delegation />
            </PrivateRoute>
          }
        />
        <Route
          path="/mint"
          element={
            <PrivateRoute>
              <MintToken />
            </PrivateRoute>
          }
        />
        <Route
          path="/send-erc20"
          element={
            <PrivateRoute>
              <SendERC20 />
            </PrivateRoute>
          }
        />
        <Route
          path="/send-native"
          element={
            <PrivateRoute>
              <SendNative />
            </PrivateRoute>
          }
        />
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

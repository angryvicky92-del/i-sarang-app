import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Navbar from './components/Navbar'
import HomeMap from './pages/HomeMap'
import CenterList from './pages/CenterList'
import Community from './pages/Community'
import MyPage from './pages/MyPage'
import CenterDetail from './pages/CenterDetail'
import PostDetail from './pages/PostDetail'
import Home from './pages/Home'
import AdminApproval from './pages/AdminApproval'
import Login from './pages/Login'
import Signup from './pages/Signup'

import { SearchProvider } from './contexts/SearchContext'

function App() {
  const location = useLocation()
  
  // Header와 Navbar를 숨길 경로 설정
  const hideLayout = ['/login', '/signup'].includes(location.pathname)

  return (
    <SearchProvider>
      <div className="app-container">
        {!hideLayout && <Header />}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<HomeMap />} />
            <Route path="/list" element={<CenterList />} />
            <Route path="/detail/:id" element={<CenterDetail />} />
            <Route path="/community" element={<Community />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/admin/approval" element={<AdminApproval />} />
          </Routes>
        </main>
        {!hideLayout && <Navbar />}
      </div>
    </SearchProvider>
  )
}

export default App

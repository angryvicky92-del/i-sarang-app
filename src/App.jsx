import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Navbar from './components/Navbar'
import { Toaster } from 'react-hot-toast'
import { SearchProvider } from './contexts/SearchContext'
import { AuthProvider } from './contexts/AuthContext'

// Lazy loading으로 초기 번들 크기 감소 → 첫 로딩 속도 향상
const Home        = lazy(() => import('./pages/Home'))
const HomeMap     = lazy(() => import('./pages/HomeMap'))
const CenterList  = lazy(() => import('./pages/CenterList'))
const CenterDetail= lazy(() => import('./pages/CenterDetail'))
const Community   = lazy(() => import('./pages/Community'))
const PostDetail  = lazy(() => import('./pages/PostDetail'))
const Login       = lazy(() => import('./pages/Login'))
const Signup      = lazy(() => import('./pages/Signup'))
const MyPage      = lazy(() => import('./pages/MyPage'))
const AdminApproval = lazy(() => import('./pages/AdminApproval'))
const EditorTest  = lazy(() => import('./pages/EditorTest'))

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#aaa', fontSize: 14 }}>
    로딩 중...
  </div>
)

function App() {
  const location = useLocation()
  const hideLayout = ['/login', '/signup'].includes(location.pathname)

  return (
    <AuthProvider>
      <SearchProvider>
        <div className="app-container">
          {!hideLayout && <Header />}
          <main>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"               element={<Home />} />
                <Route path="/map"            element={<HomeMap />} />
                <Route path="/list"           element={<CenterList />} />
                <Route path="/detail/:id"     element={<CenterDetail />} />
                <Route path="/community"      element={<Community />} />
                <Route path="/post/:id"       element={<PostDetail />} />
                <Route path="/login"          element={<Login />} />
                <Route path="/signup"         element={<Signup />} />
                <Route path="/mypage"         element={<MyPage />} />
                <Route path="/admin/approval" element={<AdminApproval />} />
                <Route path="/editor-test"    element={<EditorTest />} />
              </Routes>
            </Suspense>
          </main>
          {!hideLayout && <Navbar />}
          <Toaster position="bottom-center" toastOptions={{ style: { zIndex: 9999 } }} />
        </div>
      </SearchProvider>
    </AuthProvider>
  )
}

export default App

import { Home as HomeIcon, Map as MapIcon, List, MessageSquare, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', icon: HomeIcon, label: '홈' },
    { path: '/map', icon: MapIcon, label: '지도' },
    { path: '/list', icon: List, label: '목록' },
    { path: '/community', icon: MessageSquare, label: '커뮤니티' },
    { path: '/profile', icon: User, label: '내정보' },
  ]

  return (
    <nav className="nav-bar glass">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

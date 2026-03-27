import Logo from './Logo'
import LocationSelector from './LocationSelector'

export default function Header() {
  return (
    <header className="header glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '4px' }}>
        <Logo width={130} height={42} />
      </div>
      <LocationSelector />
    </header>
  )
}


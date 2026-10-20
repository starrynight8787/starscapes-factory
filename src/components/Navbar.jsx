import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { channels } from '../data/channels'
import { pageIsReady } from '../data/staticPages'
import { roomPath } from '../data/roomImages'
import { MEMBERSHIP } from '../data/membership'
import Logo from './Logo'
import RoomIcon from './RoomIcon'
import '../styles/site.css'
import CartNavLink from '../cart/CartNavLink'
import useIsOwner from '../admin/useIsOwner'

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}
const Chevron = () => (
  <svg {...iconProps} width="16" height="16">
    <path d="m6 9 6 6 6-6" />
  </svg>
)
const MenuIcon = () => (
  <svg {...iconProps}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)
const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export default function Navbar({ session }) {
  const isOwner = useIsOwner(session)
  const navigate = useNavigate()
  const location = useLocation()
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const roomsRef = useRef(null)

  // Close both menus whenever the page changes
  useEffect(() => {
    setRoomsOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  // Close the Rooms dropdown on an outside click, and both menus on Escape
  useEffect(() => {
    function onPointerDown(e) {
      if (roomsRef.current && !roomsRef.current.contains(e.target)) setRoomsOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setRoomsOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Stop the page scrolling behind the full-screen mobile menu
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    navigate('/')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sf-nav">
      <div className="sf-nav__inner">
        <Logo />

        {/* Desktop */}
        <div className="sf-nav__right">
          <div className="sf-nav__links">
            <div className="sf-rooms" ref={roomsRef}>
              <button
                type="button"
                className="sf-link"
                aria-expanded={roomsOpen}
                aria-controls="sf-rooms-panel"
                onClick={() => setRoomsOpen((open) => !open)}
              >
                Rooms <Chevron />
              </button>
              {roomsOpen && (
                <div className="sf-rooms__panel" id="sf-rooms-panel">
                  <p className="sf-rooms__label">The eight rooms</p>
                  <div className="sf-rooms__grid">
                    {channels.map((c) => (
                      <Link key={c.slug} to={roomPath(c.slug)} className="sf-rooms__item">
                        <RoomIcon room={c.slug} size={44} />
                        <span>
                          <span className="sf-rooms__name">{c.name}</span>{' '}
                          <span className="sf-rooms__tag">{c.tagline}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="sf-rooms__foot">
                    <span>Not sure where to start?</span>
                    <Link to={roomPath('factory-floor')}>Start on The Factory Floor →</Link>
                  </div>
                </div>
              )}
            </div>
            {pageIsReady('about') && (
              <Link to="/page/about" className="sf-link">
                About
              </Link>
            )}
            <CartNavLink className="sf-link" />
          </div>

          <div className="sf-nav__actions">
            {session ? (
              <>
                {isOwner && (
                  <Link to="/admin" className="sf-link sf-admin-btn">
                    Admin
                  </Link>
                )}
                <button type="button" className="sf-link" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="sf-link">
                  Log in
                </Link>
                <Link to={MEMBERSHIP.open ? '/membership' : '/signup'} className="sf-cta">
                  Subscribe
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile */}
        <button
          type="button"
          className="sf-iconbtn sf-burger"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </button>
      </div>

      {menuOpen && (
        <div className="sf-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="sf-menu__top">
            <Logo dark onClick={closeMenu} />
            <button
              type="button"
              className="sf-iconbtn sf-iconbtn--light"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="sf-menu__list">
            {channels.map((c) => (
              <Link key={c.slug} to={roomPath(c.slug)} className="sf-menu__item" onClick={closeMenu}>
                <RoomIcon room={c.slug} size={40} />
                {c.name}
              </Link>
            ))}
            {pageIsReady('about') && (
              <Link to="/page/about" className="sf-menu__item sf-menu__item--plain" onClick={closeMenu}>
                About
              </Link>
            )}
            <CartNavLink className="sf-menu__item sf-menu__item--plain" onClick={closeMenu} />
            {isOwner && (
              <Link to="/admin" className="sf-menu__item sf-menu__item--plain" onClick={closeMenu}>
                Admin
              </Link>
            )}
          </div>
          <div className="sf-menu__actions">
            {session ? (
              <button type="button" className="sf-btn" onClick={handleLogout}>
                Log out
              </button>
            ) : (
              <>
                <Link to="/login" className="sf-btn" onClick={closeMenu}>
                  Log in
                </Link>
                <Link to={MEMBERSHIP.open ? '/membership' : '/signup'} className="sf-btn sf-btn--solid" onClick={closeMenu}>
                  Subscribe
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

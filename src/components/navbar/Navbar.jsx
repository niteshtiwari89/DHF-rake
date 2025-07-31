// import PropTypes from 'prop-types'
// import { Link, useNavigate, useLocation } from 'react-router-dom'
// import { useState, useEffect } from 'react'
// import './Navbar.css'

// const Navbar = ({ setIsAuthenticated }) => {
//   const navigate = useNavigate()
//   const location = useLocation()
//   const [showLogoutModal, setShowLogoutModal] = useState(false)
//   const [isOpen, setIsOpen] = useState(false)
//   const [activeLink, setActiveLink] = useState(location.pathname)

//   useEffect(() => {
//     setActiveLink(location.pathname)
//   }, [location.pathname])

//   const handleLogout = () => {
//     setShowLogoutModal(true)
//   }

//   const confirmLogout = () => {
//     localStorage.removeItem('token')
//     localStorage.removeItem('userData')
//     setIsAuthenticated(false)
//     navigate('/')
//     setShowLogoutModal(false)
//   }

//   const handleLinkClick = (path) => {
//     setIsOpen(false)
//     setActiveLink(path)
//   }

//   return (
//     <>
//       <nav className="navbar">
//         <div className="navbar-logo">
//           <Link to="/home">
//             <img src="/logo1.svg" alt="Logo" className="logo" />
//           </Link>
//         </div>

//         <button className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
//           <img src="/menu.svg" alt="Menu" className="Menu" />
//         </button>

//         <div className={`nav-links ${isOpen ? 'show' : ''}`}>
//           <Link to="/home" className={`nav-link ${activeLink === '/home' ? 'active' : ''}`} onClick={() => handleLinkClick('/home')}>Home</Link>
//           <Link to="/assignedwagons" className={`nav-link ${activeLink === '/assignedwagons' ? 'active' : ''}`} onClick={() => handleLinkClick('/assignedwagons')}>Assigned Wagons</Link>
//           <Link to="/iotdash" className={`nav-link ${activeLink === '/iotdash' ? 'active' : ''}`} onClick={() => handleLinkClick('/iotdash')}>IotDash</Link>
//           <Link to="/breakdown" className={`nav-link ${activeLink === '/breakdown' ? 'active' : ''}`} onClick={() => handleLinkClick('/breakdown')}>Breakdown</Link>
//           <Link to="/reason" className={`nav-link ${activeLink === '/reason' ? 'active' : ''}`} onClick={() => handleLinkClick('/reason')}>Reason</Link>
//           <Link to="/rakechange" className={`nav-link ${activeLink === '/rakechange' ? 'active' : ''}`} onClick={() => handleLinkClick('/rakechange')}>Wagon Shifting</Link>
//           <Link to="/resolved" className={`nav-link ${activeLink === '/resolved' ? 'active' : ''}`} onClick={() => handleLinkClick('/resolved')}>Breakdown Resolved</Link>

//           <button className="logout-btn" onClick={() => {
//             handleLinkClick('/')
//             handleLogout()
//           }}>Logout</button>
//         </div>
//       </nav>

//       {showLogoutModal && (
//         <div className="modal-overlay">
//           <div className="modal">
//             <h3>Confirm Logout</h3>
//             <p>Are you sure you want to logout?</p>
//             <div className="modal-buttons">
//               <button onClick={confirmLogout} className="confirm-btn">Yes, Logout</button>
//               <button onClick={() => setShowLogoutModal(false)} className="cancel-btn">Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   )
// }

// Navbar.propTypes = {
//   setIsAuthenticated: PropTypes.func.isRequired
// }

// export default Navbar


import PropTypes from 'prop-types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const Navbar = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(location.pathname);
  const navRef = useRef(null);

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navRef]);

  // Close menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    navigate('/');
    setShowLogoutModal(false);
  };

  const handleLinkClick = (path) => {
    setIsOpen(false);
    setActiveLink(path);
  };

  return (
    <>
      <nav className="navbar" ref={navRef}>
        <div className="navbar-logo">
          <Link to="/widget">
            <img src="/logo1.svg" alt="Logo" className="logo" />
          </Link>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
        >
          <img src="/menu.svg" alt="Menu" className="Menu" />
        </button>

        <div className={`nav-links ${isOpen ? 'show' : ''}`}>
          <Link
            to="/home"
            className={`nav-link ${activeLink === '/home' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/home')}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className={`nav-link ${activeLink === '/dasboard' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/dashboard')}
          >
            Dashboard
          </Link>
          <Link
            to="/assignedwagons"
            className={`nav-link ${activeLink === '/assignedwagons' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/assignedwagons')}
          >
            Assigned Wagons
          </Link>
          <Link
            to="/iotdash"
            className={`nav-link ${activeLink === '/iotdash' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/iotdash')}
          >
            IoT Dashboard
          </Link>
          <Link
            to="/breakdown"
            className={`nav-link ${activeLink === '/breakdown' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/breakdown')}
          >
            Breakdown
          </Link>
          <Link
            to="/reason"
            className={`nav-link ${activeLink === '/reason' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/reason')}
          >
            Reason
          </Link>
          <Link
            to="/rakechange"
            className={`nav-link ${activeLink === '/rakechange' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/rakechange')}
          >
            Wagon Shifting
          </Link>
          <Link
            to="/resolved"
            className={`nav-link ${activeLink === '/resolved' ? 'active' : ''}`}
            onClick={() => handleLinkClick('/resolved')}
          >
            Breakdown Resolved
          </Link>

          <button
            className="logout-btn"
            onClick={() => {
              handleLinkClick('/');
              handleLogout();
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-buttons">
              <button onClick={confirmLogout} className="confirm-btn">Yes, Logout</button>
              <button onClick={() => setShowLogoutModal(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

Navbar.propTypes = {
  setIsAuthenticated: PropTypes.func.isRequired
};

export default Navbar;
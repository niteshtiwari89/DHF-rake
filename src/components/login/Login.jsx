// import PropTypes from 'prop-types';
// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './Login.css';

// const SESSION_TIMEOUT = 3600000; // 1 hour in milliseconds
// const EXTENDED_SESSION_TIME = 6 * 3600000; // 6 hours in milliseconds

// const Login = ({ setIsAuthenticated }) => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     employeeId: '',
//     password: ''
//   });
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     const lastActivity = localStorage.getItem('lastActivity');

//     if (token && lastActivity) {
//       const now = Date.now();
//       const timeElapsed = now - parseInt(lastActivity);

//       if (timeElapsed < EXTENDED_SESSION_TIME) {
//         if (timeElapsed > SESSION_TIMEOUT) {
//           localStorage.clear();
//           setIsAuthenticated(false);
//         } else {
//           setIsAuthenticated(true);
//           localStorage.setItem('lastActivity', now.toString());
//           navigate('/home');
//         }
//       } else {
//         localStorage.clear();
//         setIsAuthenticated(false);
//       }
//     }
//   }, [navigate, setIsAuthenticated]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     const demoCredentials = {
//       employeeId: 'DHF12345',
//       password: 'dhf@123'
//     };

//     setTimeout(() => {
//       if (formData.employeeId === demoCredentials.employeeId && 
//           formData.password === demoCredentials.password) {

//         const now = Date.now();
//         localStorage.setItem('token', 'demo-token');
//         localStorage.setItem('userData', JSON.stringify({
//           employeeId: formData.employeeId,
//           role: 'user'
//         }));
//         localStorage.setItem('lastActivity', now.toString());

//         setIsAuthenticated(true);
//         navigate('/home');
//       } else {
//         setError('Invalid employee ID or password');
//       }
//       setLoading(false);
//     }, 1000);
//   };

//   return (
//     <div className="login-container">
//       <div className="login-box">
//         <div className="logo-container">
//           <img src='/logo1.svg' alt="Company Logo" className="login-logo" />
//         </div>
//         <h2>Employee Login</h2>
//         {error && <div className="error-message">{error}</div>}
//         <form onSubmit={handleSubmit}>
//           <div className="form-group">
//             <label htmlFor="employeeId">Employee ID</label>
//             <input
//               type="text"
//               id="employeeId"
//               name="employeeId"
//               value={formData.employeeId}
//               onChange={handleChange}
//               required
//               placeholder="Enter Employee ID"
//               disabled={loading}
//             />
//           </div>
//           <div className="form-group">
//             <label htmlFor="password">Password</label>
//             <input
//               type="password"
//               id="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               required
//               placeholder="Enter Password"
//               disabled={loading}
//             />
//           </div>
//           <button 
//             type="submit" 
//             className="login-btn"
//             disabled={loading}
//           >
//             {loading ? 'Logging in...' : 'Login'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// Login.propTypes = {
//   setIsAuthenticated: PropTypes.func.isRequired
// };

// export default Login;




import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Make sure to install axios if not already done
import './Login.css';

const SESSION_TIMEOUT = 3600000; // 1 hour in milliseconds

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const lastActivity = localStorage.getItem('lastActivity');

    if (token && lastActivity) {
      const now = Date.now();
      const timeElapsed = now - parseInt(lastActivity);

      if (timeElapsed < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
        localStorage.setItem('lastActivity', now.toString());
        navigate('/home');
      } else {
        localStorage.clear();
        setIsAuthenticated(false);
      }
    }
  }, [navigate, setIsAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Replace with your actual API endpoint
      const response = await axios.post('https://server-api-pearl.vercel.app/api/admin/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.data.token) {
        const now = Date.now();
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('lastActivity', now.toString());

        // Parse the JWT to get user data (optional)
        const tokenData = JSON.parse(atob(response.data.token.split('.')[1]));
        localStorage.setItem('userData', JSON.stringify({
          id: tokenData.id,
          role: tokenData.role,
          name: tokenData.name
        }));

        setIsAuthenticated(true);
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container">
          <img src='/logo1.svg' alt="Company Logo" className="login-logo" />
        </div>
        <h2>Admin Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter Email"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter Password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

Login.propTypes = {
  setIsAuthenticated: PropTypes.func.isRequired
};

export default Login;
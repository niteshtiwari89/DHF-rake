import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from "./components/home/Home"
import IotDash from "./components/iotdash/IotDash"
import Navbar from "./components/navbar/Navbar"
import Login from "./components/login/Login"
import Reason from './components/reasons/Reason'
import Rakechange from './components/rakechange/Rakechange'
import Breakdown from './components/breakdowntable/Breakdown'
import AssignedWagon from './components/assignedwagon/AssignedWagon'
import History from './components/history/History'
import BreakdownResolveScreen from './components/breakdownresolved/BreakdownResolved'
import ResolvedHistory from './components/resolvedhistory/ResolvedHistory'
import Dashboard from './components/dashboard/Dashboard'

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={
          <Login setIsAuthenticated={setIsAuthenticated} />
        } />
        {isAuthenticated ? (
          <>
            <Route path="/home" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><Home /></>} />
            <Route path="/dashboard" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><Dashboard /></>} />
            <Route path="/iotdash" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><IotDash /></>} />
            <Route path="/reason" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><Reason /></>} />
            <Route path="/rakechange" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><Rakechange /></>} />
            <Route path="/breakdown" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><Breakdown /></>} />
            <Route path="/assignedwagons" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><AssignedWagon /></>} />
            <Route path="/history" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><History /></>} />
            <Route path="/resolved" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><BreakdownResolveScreen /></>} />
            <Route path="/breakdownHistory" element={<><Navbar setIsAuthenticated={setIsAuthenticated} /><ResolvedHistory /></>} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
      </Routes>
    </>
  )
}

export default App
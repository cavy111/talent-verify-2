// frontend/src/App.tsx (updated routes)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Companies from './components/Companies';
import Employees from './components/Employees';
import AdvancedEmployeeSearch from './components/AdvancedEmployeeSearch';
import BulkUpload from './components/BulkUpload';
import Audit from './components/Audit';
import AcceptInvitation from './components/AcceptInvitation';
import UserManagement from './components/UserManagement';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const isAuthenticated = localStorage.getItem('access_token');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/companies" 
            element={isAuthenticated ? <Companies /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/employees" 
            element={isAuthenticated ? <Employees /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/search" 
            element={isAuthenticated ? <AdvancedEmployeeSearch /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/bulk-upload" 
            element={isAuthenticated ? <BulkUpload /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/audit" 
            element={isAuthenticated ? <Audit /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/users" element={isAuthenticated ? <UserManagement /> : <Navigate to="/login" />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
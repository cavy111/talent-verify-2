import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/api';

interface Profile {
  role_name: string
  page: string
}

const NavBar: React.FC<Profile> = ({role_name, page}) =>{
    const navigate = useNavigate();

    const handleLogout = () => {
        AuthService.logout();
        navigate('/login');
      };
    
    return (
    <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Talent Verify {page}
          </Typography>
          <Button color="inherit" onClick={() => navigate('/')}>
            Dashboard
          </Button>
          {role_name === 'talent_verify_admin' && <Button color="inherit" onClick={() => navigate('/companies')}>
            Companies
          </Button>}
          <Button color="inherit" onClick={() => navigate('/employees')}>
            Employees
          </Button>
          <Button color="inherit" onClick={() => navigate('/bulk-upload')}>
            Bulk Upload
          </Button>
          {role_name === 'talent_verify_admin' &&<Button color="inherit" onClick={() => navigate('/audit')}>
            Audit Logs
          </Button>}
          <Button color="inherit" onClick={() => navigate('/users')}>
            Manage Users
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>)
}

export default NavBar
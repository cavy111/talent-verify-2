import React from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { AuthService } from '../services/api';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        AuthService.logout();
        navigate('/login');
    };

    return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Talent Verify Dashboard
          </Typography>
          <Button color="inherit" onClick={() => navigate('/companies')}>
            Companies
          </Button>
          <Button color="inherit" onClick={() => navigate('/employees')}>
            Employees
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Talent Verify
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={{xs:12, md:6}}  sx={{ display: 'flex' }}>
            <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Manage Companies
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Add, edit, and manage company information including registration details and departments.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate('/companies')}>
                  Go to Companies
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid size={{xs:12, md:6}} sx={{ display: 'flex' }}>
            <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Manage Employees
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Add, edit, and search employee records with their position history and details.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate('/employees')}>
                  Go to Employees
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default Dashboard
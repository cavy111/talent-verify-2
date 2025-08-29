import React, { useState, useEffect } from 'react';
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
  Box,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { AuthService, employeeService, bulkUploadService, employeeServiceEnhanced } from '../services/api';
import NavBar from './NavBar';

interface Analytics {
  total_employees: number;
  active_employees: number;
  by_department: Record<string, number>;
  by_employment_type: Record<string, number>;
}

interface Profile {
  role_name: string
}

interface BulkJob {
  id: string;
  operation_type: string;
  status: string;
  progress_percentage: number;
  file_name: string;
}

const Dashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentJobs, setRecentJobs] = useState<BulkJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null)
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, jobsRes, profileRes] = await Promise.all([
        employeeServiceEnhanced.getAnalytics(),
        bulkUploadService.getJobs(),
        AuthService.getProfile()
      ]);
      
      setAnalytics(analyticsRes.data);
      setRecentJobs(jobsRes.data.results || jobsRes.data);
      setProfile(profileRes)
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

   const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'info';
      case 'partial': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
return (
    <>
      <NavBar role_name={profile?.role_name || ''} page='Dashboard'/>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Talent Verify
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* Analytics Cards */}
        {analytics && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs:12,md:3}}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Employees
                  </Typography>
                  <Typography variant="h4">
                    {analytics.total_employees}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs:12,md:3}}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Employees
                  </Typography>
                  <Typography variant="h4">
                    {analytics.active_employees}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs:12,md:6}}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Department Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {Object.entries(analytics.by_department).map(([dept, count]) => (
                      <Chip key={dept} label={`${dept}: ${count}`} size="small" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Main Action Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          { profile?.role_name === 'talent_verify_admin' && <Grid size={{xs:12,md:4}}>
            <Card>
              <CardContent>
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
          </Grid>}
          
          <Grid size={{xs:12,md:4}}>
            <Card>
              <CardContent>
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

          <Grid size={{xs:12,md:4}} >
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  Bulk Operations
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Upload CSV/Excel files to import multiple employees or companies at once.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate('/bulk-upload')}>
                  Go to Bulk Upload
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Bulk Jobs */}
        {recentJobs.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Bulk Upload Jobs
              </Typography>
              {recentJobs.map((job) => (
                <Box key={job.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ flexGrow: 1 }}>
                    {job.file_name} - {job.operation_type}
                  </Typography>
                  <Chip 
                    label={job.status} 
                    color={getStatusColor(job.status) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {job.status === 'processing' && (
                    <CircularProgress 
                      variant="determinate" 
                      value={job.progress_percentage} 
                      size={20} 
                    />
                  )}
                </Box>
              ))}
              <Button 
                size="small" 
                onClick={() => navigate('/bulk-upload')}
                sx={{ mt: 1 }}
              >
                View All Jobs
              </Button>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  );
}

export default Dashboard
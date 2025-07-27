import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert
} from '@mui/material';
import { CompanyService, AuthService } from '../services/api';

interface Company {
  id: number;
  name: string;
  registration_number: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  registration_date: string;
  employee_count: number;
}

const Companies: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        registration_number: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        registration_date: '',
        employee_count: 0
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
    try {
      const response = await CompanyService.getAll();
      setCompanies(response.data.results || response.data);
    } catch (err) {
      setError('Failed to fetch companies');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await CompanyService.create(formData);
      setOpen(false);
      setFormData({
        name: '',
        registration_number: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        registration_date: '',
        employee_count: 0
      });
      fetchCompanies();
    } catch (err) {
      setError('Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Companies
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Typography variant="h4">Companies</Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Add Company
          </Button>
        </div>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Registration #</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Employees</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>{company.name}</TableCell>
                  <TableCell>{company.registration_number}</TableCell>
                  <TableCell>{company.contact_person}</TableCell>
                  <TableCell>{company.email}</TableCell>
                  <TableCell>{company.phone}</TableCell>
                  <TableCell>{company.employee_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Company Name"
              margin="dense"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Registration Number"
              margin="dense"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
            />
            <TextField
              fullWidth
              label="Contact Person"
              margin="dense"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="dense"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone"
              margin="dense"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={3}
              margin="dense"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              fullWidth
              label="Registration Date"
              type="date"
              margin="dense"
              InputLabelProps={{ shrink: true }}
              value={formData.registration_date}
              onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
            />
            <TextField
              fullWidth
              label="Employee Count"
              type="number"
              margin="dense"
              value={formData.employee_count}
              onChange={(e) => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );

}

export default Companies
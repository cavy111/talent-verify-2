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
  TextField,
  Box,
  Alert
} from '@mui/material';
import { employeeService, AuthService } from '../services/api';

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  email: string;
  phone: string;
  company_name: string;
}

const Employees: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async (search?: string) => {
    try {
      const params = search ? { search } : {};
      const response = await employeeService.getAll(params);
      setEmployees(response.data.results || response.data);
    } catch (err) {
      setError('Failed to fetch employees');
    }
  };

  const handleSearch = () => {
    fetchEmployees(searchTerm);
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
            Employees
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={() => navigate('/companies')}>
            Companies
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Employees
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            label="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
          <Button variant="outlined" onClick={() => { setSearchTerm(''); fetchEmployees(); }}>
            Clear
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Company</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.employee_id}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>{employee.company_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}

export default Employees

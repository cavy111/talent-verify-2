import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  Search,
  FilterList,
  ExpandMore,
  Download,
  Person,
  Business,
  Work
} from '@mui/icons-material';
import { employeeServiceEnhanced, CompanyService } from '../services/api';

interface SearchFilters {
  name: string;
  company: string;
  department: string;
  role: string;
  employment_type: string;
  year_started: string;
  year_left: string;
  is_current: string;
  experience_years: string;
}

const AdvancedEmployeeSearch: React.FC = () => {
    const [filters, setFilters] = useState<SearchFilters>({
    name: '',
    company: '',
    department: '',
    role: '',
    employment_type: '',
    year_started: '',
    year_left: '',
    is_current: '',
    experience_years: ''
  });

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState<any>(null);

  const employmentTypes = [
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' },
    { value: 'consultant', label: 'Consultant' }
  ];

  useEffect(() => {
    loadCompanies();
    search();
  }, [page, rowsPerPage]);

  const loadCompanies = async () => {
    try {
      const response = await CompanyService.getAll();
      setCompanies(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const search = async () => {
    setLoading(true);
    setError('');

    try {
      // Clean filters - remove empty values
      const cleanFilters = Object.entries(filters)
        .filter(([key, value]) => value !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as any);

      // Add pagination
      cleanFilters.page = page + 1;
      cleanFilters.page_size = rowsPerPage;

      const response = await employeeServiceEnhanced.search(cleanFilters);
      
      setEmployees(response.data.results || response.data);
      setTotalCount(response.data.count || (response.data.results?.length || response.data.length || 0));
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      company: '',
      department: '',
      role: '',
      employment_type: '',
      year_started: '',
      year_left: '',
      is_current: '',
      experience_years: ''
    });
    setPage(0);
  };

  const exportResults = async () => {
    try {
      const cleanFilters = Object.entries(filters)
        .filter(([key, value]) => value !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as any);

      const response = await employeeServiceEnhanced.export(cleanFilters);
      
      // Create and download CSV
      const csvContent = response.data.data.map((row: any) => 
        Object.values(row).join(',')
      ).join('\n');
      
      const headers = Object.keys(response.data.data[0] || {}).join(',');
      const fullCsv = `${headers}\n${csvContent}`;
      
      const blob = new Blob([fullCsv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employee_search_results.csv';
      link.click();
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Export failed');
    }
  };

  const viewHistory = async (employee: any) => {
    try {
      setSelectedEmployee(employee);
      const response = await employeeServiceEnhanced.getHistory(employee.id);
      setEmployeeHistory(response.data);
      setShowHistory(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load history');
    }
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Employee Search
      </Typography>

      {/* Search Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterList sx={{ mr: 1 }} />
              <Typography>
                Search Filters
                {getActiveFiltersCount() > 0 && (
                  <Chip 
                    size="small" 
                    label={getActiveFiltersCount()} 
                    color="primary" 
                    sx={{ ml: 1 }} 
                  />
                )}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{xs:12 ,md:4}}>
                <TextField
                  fullWidth
                  label="Employee Name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              
              <Grid size={{xs:12 ,md:4}} >
                <FormControl fullWidth>
                  <InputLabel>Company</InputLabel>
                  <Select
                    value={filters.company}
                    label="Company"
                    onChange={(e) => handleFilterChange('company', e.target.value)}
                    startAdornment={<Business sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value="">All Companies</MenuItem>
                    {companies.map((company: any) => (
                      <MenuItem key={company.id} value={company.name}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <TextField
                  fullWidth
                  label="Department"
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                />
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <TextField
                  fullWidth
                  label="Role/Position"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  InputProps={{
                    startAdornment: <Work sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <FormControl fullWidth>
                  <InputLabel>Employment Type</InputLabel>
                  <Select
                    value={filters.employment_type}
                    label="Employment Type"
                    onChange={(e) => handleFilterChange('employment_type', e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {employmentTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <TextField
                  fullWidth
                  label="Year Started"
                  type="number"
                  value={filters.year_started}
                  onChange={(e) => handleFilterChange('year_started', e.target.value)}
                  inputProps={{ min: 1980, max: new Date().getFullYear() }}
                />
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <TextField
                  fullWidth
                  label="Year Left"
                  type="number"
                  value={filters.year_left}
                  onChange={(e) => handleFilterChange('year_left', e.target.value)}
                  inputProps={{ min: 1980, max: new Date().getFullYear() }}
                />
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <FormControl fullWidth>
                  <InputLabel>Current Status</InputLabel>
                  <Select
                    value={filters.is_current}
                    label="Current Status"
                    onChange={(e) => handleFilterChange('is_current', e.target.value)}
                  >
                    <MenuItem value="">All Employees</MenuItem>
                    <MenuItem value="true">Current Employees</MenuItem>
                    <MenuItem value="false">Former Employees</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12 ,md:4}}>
                <TextField
                  fullWidth
                  label="Minimum Experience (Years)"
                  type="number"
                  value={filters.experience_years}
                  onChange={(e) => handleFilterChange('experience_years', e.target.value)}
                  inputProps={{ min: 0, max: 50 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={search}
                disabled={loading}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={exportResults}
                disabled={employees.length === 0}
              >
                Export Results
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Current Role</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Employment Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee: any) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.employee_id}</TableCell>
                  <TableCell>{employee.company_name}</TableCell>
                  <TableCell>
                    {employee.current_position?.role || 'No current position'}
                  </TableCell>
                  <TableCell>
                    {employee.current_position?.department?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {employee.current_position?.employment_type || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.is_active ? 'Active' : 'Inactive'}
                      color={employee.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => viewHistory(employee)}
                    >
                      View History
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      {/* Employee History Dialog */}
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Employment History - {selectedEmployee?.name}
        </DialogTitle>
        <DialogContent>
          {employeeHistory && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Position History ({employeeHistory.total_positions} positions)
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Experience: {Math.round(employeeHistory.total_experience_days / 365)} years
              </Typography>

              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Current</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeHistory.positions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell>{position.role}</TableCell>
                        <TableCell>{position.department.name}</TableCell>
                        <TableCell>
                          {new Date(position.start_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {position.end_date 
                            ? new Date(position.end_date).toLocaleDateString()
                            : 'Present'
                          }
                        </TableCell>
                        <TableCell>
                          {Math.round(position.duration / 365)} years
                        </TableCell>
                        <TableCell>
                          {position.employment_type.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          {position.is_current && (
                            <Chip label="Current" color="primary" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default AdvancedEmployeeSearch
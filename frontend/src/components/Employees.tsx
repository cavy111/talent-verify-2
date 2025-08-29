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
  Alert,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab
} from '@mui/material';
import { 
  History, 
  Analytics, 
  FileDownload, 
  FilterList, 
  Close,
  ExpandMore,
  Business,
  Work,
  Add as AddIcon,
  Person
} from '@mui/icons-material';
import { employeeService, AuthService, employeeServiceEnhanced, CompanyService } from '../services/api';
import NavBar from './NavBar';

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  email: string;
  phone: string;
  company_name: string;
  company: string;
  current_position?: {
    role: string;
    department: { name: string };
    employment_type: string;
    start_date: string;
  };
  positions?: Array<{
    id: number;
    role: string;
    department: { name: string };
    start_date: string;
    end_date: string | null;
    is_current: boolean;
    employment_type: string;
    salary: number | null;
  }>;
}

interface EmployeeHistory {
  id: number;
  name: string;
  positions: Array<{
    id: number;
    role: string;
    department: { name: string };
    start_date: string;
    end_date: string | null;
    is_current: boolean;
    employment_type: string;
    salary: number | null;
    duties: string;
  }>;
  total_positions: number;
  total_experience_days: number;
}

interface Profile {
  role_name: string;
  company: Company;
}

interface Company {
  id: number;
  name: string;
}

interface Analytics {
  total_employees: number;
  active_employees: number;
  by_department: Record<string, number>;
  by_employment_type: Record<string, number>;
}

interface NewPosition {
  role: string;
  department_name: string;
  employment_type: string;
  start_date: string;
  salary: string;
  duties: string;
}

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    role: '',
    employment_type: '',
    experience_years: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeHistory | null>(null);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [addPositionDialog, setAddPositionDialog] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  
  // New position form state
  const [newPosition, setNewPosition] = useState<NewPosition>({
    role: '',
    department_name: '',
    employment_type: '',
    start_date: new Date().toISOString().split('T')[0], // Today's date
    salary: '',
    duties: ''
  });

  // New employee form
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
          name: '',
          employee_id: '',
          email: '',
          phone: '',
          company: ''
      });

  const navigate = useNavigate();

  useEffect(()=>{
    const fetchProfile = async() =>{
      const response = await AuthService.getProfile()
      setProfile(response)
      
      if (response.role_name === 'talent_verify_admin'){
        const company_response = await CompanyService.getAll()
        setCompanies(company_response.data.results)
      }else{
        setFormData({...formData,company:response.company})
      }
      
    }
    try{
      fetchProfile()
    }catch(error){
      setError('Failed to fetch profile')
    }
  },[])

  useEffect(() => {
    fetchEmployees();
    if (tabValue === 1) {
      fetchAnalytics();
    }
  }, [tabValue]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchEmployees = async (search?: string, additionalFilters?: any) => {
    try {
      const params = { 
        search: search || searchTerm,
        ...additionalFilters,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key as keyof typeof params]) {
          delete params[key as keyof typeof params];
        }
      });

      const response = await employeeService.getAll(params);
      setEmployees(response.data.results || response.data);
    } catch (err) {
      setError('Failed to fetch employees');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await employeeServiceEnhanced.getAnalytics();
      setAnalytics(response.data);
    } catch (err) {
      setError('Failed to fetch analytics');
    }
  };

  const fetchEmployeeHistory = async (employeeId: number) => {
    try {
      const response = await employeeServiceEnhanced.getHistory(employeeId);
      const employee = response.data;
      
      // Transform the data to match EmployeeHistory interface
      const historyData: EmployeeHistory = {
        id: employee.id,
        name: employee.name,
        positions: employee.positions || [],
        total_positions: employee.positions?.length || 0,
        total_experience_days: calculateTotalExperience(employee.positions || [])
      };
      
      setSelectedEmployee(historyData);
      setHistoryDialog(true);
    } catch (err) {
      setError('Failed to fetch employee history');
    }
  };

  const handleAddPosition = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      // Prepare the data for the API
      const positionData = {
        role: newPosition.role,
        department_name: newPosition.department_name,
        employment_type: newPosition.employment_type,
        start_date: newPosition.start_date,
        salary: newPosition.salary ? parseFloat(newPosition.salary) : null,
        duties: newPosition.duties || ''
      };

      await employeeServiceEnhanced.addPosition(selectedEmployee.id, positionData);
      
      // Reset form
      setNewPosition({
        role: '',
        department_name: '',
        employment_type: '',
        start_date: new Date().toISOString().split('T')[0],
        salary: '',
        duties: ''
      });
      
      setAddPositionDialog(false);
      setSuccess('Position added successfully!');
      
      // Refresh the employee history
      await fetchEmployeeHistory(selectedEmployee.id);
      
      // Refresh the main employee list to show updated current position
      await fetchEmployees();
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add position');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
      setLoading(true);
      try {
        console.log(formData);
        
        await employeeService.create(formData);
        setOpen(false);
        setFormData({
           name: '',
          employee_id: '',
          email: '',
          phone: '',
          company:''
        });
        fetchEmployees();
        setError('')
        setSuccess('Employee Created Successfully')
      } catch (err) {
        setError('Failed to create employee');
      } finally {
        setLoading(false);
      }
    };

  const calculateTotalExperience = (positions: any[]) => {
    let totalDays = 0;
    const today = new Date();
    
    positions.forEach(position => {
      const startDate = new Date(position.start_date);
      const endDate = position.end_date ? new Date(position.end_date) : today;
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    });
    
    return totalDays;
  };

  const exportEmployees = async () => {
    try {
      const response = await employeeServiceEnhanced.export(filters);
      
      const employees = response.data.data;
      console.log(employees);
      
      // Create CSV content
      const csvHeader = 'Name,Employee ID,Email,Phone,Company,Current Role,Current Department\n';
      const csvContent = employees.map((emp: Employee) => 
        `"${emp.name}","${emp.employee_id}","${emp.email}","${emp.phone}","${emp.company}","${emp.current_position?.role || ''}","${emp.current_position?.department?.name || ''}"`
      ).join('\n');
      
      const fullCsv = csvHeader + csvContent;
      
      // Download CSV
      const blob = new Blob([fullCsv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.log(err);      
      setError('Failed to export employees');
    }
  };

  const handleSearch = () => {
    fetchEmployees(searchTerm);
  };

  const applyFilters = () => {
    fetchEmployees(searchTerm, filters);
    setFilterDrawer(false);
  };

  const clearFilters = () => {
    setFilters({
      department: '',
      role: '',
      employment_type: '',
      experience_years: ''
    });
    setSearchTerm('');
    fetchEmployees();
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const formatDuration = (days: number) => {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    
    if (years > 0 && months > 0) {
      return `${years}y ${months}m`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${days} days`;
    }
  };

  const isFormValid = () => {
    return newPosition.role.trim() && 
           newPosition.department_name.trim() && 
           newPosition.employment_type && 
           newPosition.start_date;
  };

  return (
    <>
      <NavBar role_name={profile?.role_name || ''} page='Employees'/>

      <Container sx={{ mt: 4 }}>
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Employee Name"
              margin="dense"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Employee ID"
              margin="dense"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            />
            {/* <TextField
              fullWidth
              label="Department"
              margin="dense"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            /> */}
            <TextField
            style={{display:profile?.role_name !== 'talent_verify_admin'?'none':'block'}}
              fullWidth
              select
              label="Company"
              margin="dense"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              disabled = {profile?.role_name !== 'talent_verify_admin'}
            >
              {companies.length > 0 ? (companies.map(company=>(
                <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
              ))) : <p>No companies avilable</p> }
            </TextField>
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
            {/* <TextField
              fullWidth
              label="Duties"
              multiline
              rows={3}
              margin="dense"
              value={formData.duties}
              onChange={(e) => setFormData({ ...formData, duties: e.target.value })}
            /> */}
            {/* <TextField
              fullWidth
              label="Start Date"
              type="date"
              margin="dense"
              InputLabelProps={{ shrink: true }}
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <TextField
              fullWidth
              label="Salary"
              margin="dense"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
            <TextField
              fullWidth
              label="Role"
              margin="dense"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
            <TextField
              fullWidth
              label="Employee Type"
              margin="dense"
              value={formData.employment_type}
              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
            /> */}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography variant="h4" gutterBottom>
          Employees
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Employee
        </Button>
        </div>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Tabs for different views */}
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="Employee List" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Tab Panel 0: Employee List */}
        {tabValue === 0 && (
          <>
            {/* Enhanced Action Bar */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 300 }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Tooltip title="Advanced Filters">
                <IconButton onClick={() => setFilterDrawer(true)}>
                  <FilterList />
                </IconButton>
              </Tooltip>
              <Button variant="contained" onClick={handleSearch}>
                Search
              </Button>
              <Button variant="outlined" onClick={clearFilters}>
                Clear All
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={exportEmployees}
              >
                Export
              </Button>
            </Box>

            {/* Enhanced Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Current Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.employee_id}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          {employee.current_position?.role || 'No Current Position'}
                        </TableCell>
                        <TableCell>
                          {employee.current_position?.department?.name || '-'}
                        </TableCell>
                        <TableCell>{employee.company_name}</TableCell>
                        <TableCell>
                          <Tooltip title="View History">
                            <IconButton 
                              size="small" 
                              onClick={() => fetchEmployeeHistory(employee.id)}
                            >
                              <History />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Tab Panel 1: Analytics */}
        {tabValue === 1 && (
          <Box>
            {analytics ? (
              <Grid container spacing={3}>
                <Grid size={{xs:12,md:6}}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Employee Statistics
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h4" color="primary">
                          {analytics.total_employees}
                        </Typography>
                        <Typography color="textSecondary">Total Employees</Typography>
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h4" color="success.main">
                          {analytics.active_employees}
                        </Typography>
                        <Typography color="textSecondary">Active Employees</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid size={{xs:12,md:6}}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Department Distribution
                      </Typography>
                      {Object.keys(analytics.by_department).length === 0 ? (
                        <Typography color="textSecondary">No department data available</Typography>
                      ) : (
                        Object.entries(analytics.by_department).map(([dept, count]) => (
                          <Box key={dept} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>{dept}</Typography>
                            <Chip label={count} size="small" />
                          </Box>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{xs:12,md:6}}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <Work sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Employment Type Distribution
                      </Typography>
                      {Object.keys(analytics.by_employment_type).length === 0 ? (
                        <Typography color="textSecondary">No employment type data available</Typography>
                      ) : (
                        Object.entries(analytics.by_employment_type).map(([type, count]) => (
                          <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ textTransform: 'capitalize' }}>
                              {type.replace('_', ' ')}
                            </Typography>
                            <Chip label={count} size="small" color="primary" />
                          </Box>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Typography>Loading analytics...</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Filter Drawer */}
        <Drawer
          anchor="right"
          open={filterDrawer}
          onClose={() => setFilterDrawer(false)}
        >
          <Box sx={{ width: 350, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Advanced Filters</Typography>
              <IconButton onClick={() => setFilterDrawer(false)}>
                <Close />
              </IconButton>
            </Box>
            
            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              label="Department"
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Role"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Employment Type</InputLabel>
              <Select
                value={filters.employment_type}
                onChange={(e) => setFilters({ ...filters, employment_type: e.target.value })}
                label="Employment Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="full_time">Full Time</MenuItem>
                <MenuItem value="part_time">Part Time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
                <MenuItem value="consultant">Consultant</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Minimum Experience (years)"
              type="number"
              value={filters.experience_years}
              onChange={(e) => setFilters({ ...filters, experience_years: e.target.value })}
              margin="normal"
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="contained" onClick={applyFilters} fullWidth>
                Apply Filters
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => {
                  setFilters({
                    department: '',
                    role: '',
                    employment_type: '',
                    experience_years: ''
                  });
                }}
                fullWidth
              >
                Clear
              </Button>
            </Box>
          </Box>
        </Drawer>

        {/* Employee History Dialog */}
        <Dialog 
          open={historyDialog} 
          onClose={() => setHistoryDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Employment History: {selectedEmployee?.name}
              </Typography>
              <Box>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setAddPositionDialog(true)}
                  sx={{ mr: 1 }}
                  variant="outlined"
                  size="small"
                >
                  Add Position
                </Button>
                <IconButton onClick={() => setHistoryDialog(false)}>
                  <Close />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {selectedEmployee && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid size={{xs:6}}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Total Positions
                          </Typography>
                          <Typography variant="h4">
                            {selectedEmployee.total_positions}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{xs:6}}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Total Experience
                          </Typography>
                          <Typography variant="h4">
                            {formatDuration(selectedEmployee.total_experience_days)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                <Typography variant="h6" gutterBottom>
                  Position History
                </Typography>

                {selectedEmployee.positions.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Person sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography color="textSecondary" gutterBottom>
                      No positions found
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setAddPositionDialog(true)}
                    >
                      Add First Position
                    </Button>
                  </Box>
                ) : (
                  selectedEmployee.positions.map((position, index) => (
                    <Accordion key={position.id} defaultExpanded={index === 0}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography sx={{ flexGrow: 1 }}>
                            <strong>{position.role}</strong> - {position.department.name}
                          </Typography>
                          {position.is_current && (
                            <Chip label="Current" color="primary" size="small" />
                          )}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid size={{xs:12,md:6}}>
                            <Typography variant="body2" color="textSecondary">
                              Start Date
                            </Typography>
                            <Typography>
                              {new Date(position.start_date).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          <Grid size={{xs:12,md:6}}>
                            <Typography variant="body2" color="textSecondary">
                              End Date
                            </Typography>
                            <Typography>
                              {position.end_date 
                                ? new Date(position.end_date).toLocaleDateString()
                                : 'Present'
                              }
                            </Typography>
                          </Grid>
                          <Grid size={{xs:12,md:6}}>
                            <Typography variant="body2" color="textSecondary">
                              Employment Type
                            </Typography>
                            <Typography sx={{ textTransform: 'capitalize' }}>
                              {position.employment_type.replace('_', ' ')}
                            </Typography>
                          </Grid>
                          {position.salary && (
                            <Grid size={{xs:12,md:6}}>
                              <Typography variant="body2" color="textSecondary">
                                Salary
                              </Typography>
                              <Typography>
                                ${position.salary.toLocaleString()}
                              </Typography>
                            </Grid>
                          )}
                          {position.duties && (
                            <Grid size={{xs:12}}>
                              <Typography variant="body2" color="textSecondary">
                                Duties
                              </Typography>
                              <Typography>
                                {position.duties}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setHistoryDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Position Dialog */}
        <Dialog 
          open={addPositionDialog} 
          onClose={() => setAddPositionDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6">
              Add New Position for {selectedEmployee?.name}
            </Typography>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    fullWidth
                    label="Role/Position Title *"
                    value={newPosition.role}
                    onChange={(e) => setNewPosition({ ...newPosition, role: e.target.value })}
                    required
                  />
                </Grid>
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    fullWidth
                    label="Department Name *"
                    value={newPosition.department_name}
                    onChange={(e) => setNewPosition({ ...newPosition, department_name: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid size={{xs:12,md:6}}>
                  <FormControl fullWidth required>
                    <InputLabel>Employment Type</InputLabel>
                    <Select
                      value={newPosition.employment_type}
                      onChange={(e) => setNewPosition({ ...newPosition, employment_type: e.target.value })}
                      label="Employment Type"
                    >
                      <MenuItem value="full_time">Full Time</MenuItem>
                      <MenuItem value="part_time">Part Time</MenuItem>
                      <MenuItem value="contract">Contract</MenuItem>
                      <MenuItem value="intern">Intern</MenuItem>
                      <MenuItem value="consultant">Consultant</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    fullWidth
                    label="Start Date *"
                    type="date"
                    value={newPosition.start_date}
                    onChange={(e) => setNewPosition({ ...newPosition, start_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                
                <Grid size={{xs:12,md:6}}>
                  <TextField
                    fullWidth
                    label="Salary"
                    type="number"
                    value={newPosition.salary}
                    onChange={(e) => setNewPosition({ ...newPosition, salary: e.target.value })}
                    InputProps={{
                      startAdornment: '$'
                    }}
                    helperText="Optional - leave blank if not applicable"
                  />
                </Grid>
                
                <Grid size={{xs:12}}>
                  <TextField
                    fullWidth
                    label="Job Duties/Description"
                    multiline
                    rows={4}
                    value={newPosition.duties}
                    onChange={(e) => setNewPosition({ ...newPosition, duties: e.target.value })}
                    helperText="Optional - describe key responsibilities and duties"
                  />
                </Grid>
              </Grid>

              {selectedEmployee?.positions?.some(p => p.is_current) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Note: Adding this position will automatically end the current position and set this as the new current position.
                  </Typography>
                </Alert>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setAddPositionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleAddPosition}
              disabled={!isFormValid() || loading}
            >
              {loading ? 'Adding...' : 'Add Position'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

export default Employees;
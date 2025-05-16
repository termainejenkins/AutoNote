import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Note as NoteIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';

const validationSchema = Yup.object({
  username: Yup.string()
    .min(3, 'Username should be of minimum 3 characters length')
    .required('Username is required'),
  email: Yup.string()
    .email('Enter a valid email')
    .required('Email is required'),
  currentPassword: Yup.string()
    .min(8, 'Password should be of minimum 8 characters length')
    .when('newPassword', {
      is: (val: string) => val?.length > 0,
      then: Yup.string().required('Current password is required'),
    }),
  newPassword: Yup.string()
    .min(8, 'Password should be of minimum 8 characters length'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .when('newPassword', {
      is: (val: string) => val?.length > 0,
      then: Yup.string().required('Confirm password is required'),
    }),
});

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  const { notes } = useSelector((state: RootState) => state.notes);
  const [success, setSuccess] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema,    onSubmit: async (values) => {
      try {
        const updates: { username?: string; email?: string } = {};
        
        if (values.username !== user?.username) {
          updates.username = values.username;
        }
        if (values.email !== user?.email) {
          updates.email = values.email;
        }

        // Only dispatch update if there are changes
        if (Object.keys(updates).length > 0) {
          await dispatch(updateUser({
            id: user?.id || '',
            ...updates
          })).unwrap();
        }

        // Handle password update if new password is provided
        if (values.newPassword) {
          await api.updatePassword(values.currentPassword, values.newPassword);
        }

        setSuccess('Profile updated successfully');
        formik.resetForm({
          values: {
            ...values,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          },
        });
      } catch (err) {
        console.error('Failed to update profile:', err);
      }
    },
  });

  const stats = {
    totalNotes: notes.length,
    lastActive: new Date().toLocaleDateString(),
    averageNotesPerDay: Math.round(notes.length / 30), // Assuming 30 days
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={formik.handleSubmit}>
                <TextField
                  fullWidth
                  id="username"
                  name="username"
                  label="Username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  error={formik.touched.username && Boolean(formik.errors.username)}
                  helperText={formik.touched.username && formik.errors.username}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                  sx={{ mb: 2 }}
                />

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Change Password
                </Typography>

                <TextField
                  fullWidth
                  id="currentPassword"
                  name="currentPassword"
                  label="Current Password"
                  type="password"
                  value={formik.values.currentPassword}
                  onChange={formik.handleChange}
                  error={formik.touched.currentPassword && Boolean(formik.errors.currentPassword)}
                  helperText={formik.touched.currentPassword && formik.errors.currentPassword}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  id="newPassword"
                  name="newPassword"
                  label="New Password"
                  type="password"
                  value={formik.values.newPassword}
                  onChange={formik.handleChange}
                  error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
                  helperText={formik.touched.newPassword && formik.errors.newPassword}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                  helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                  sx={{ mb: 2 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistics
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <NoteIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Notes"
                    secondary={stats.totalNotes}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <TimeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Last Active"
                    secondary={stats.lastActive}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <NoteIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Average Notes per Day"
                    secondary={stats.averageNotesPerDay}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile; 
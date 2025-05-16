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
import { RootState, AppDispatch } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { authApi } from '../../services/api';
import { User } from '../../types';

interface ProfileFormValues {
  username: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username should be of minimum 3 characters length')
    .max(30, 'Username should be of maximum 30 characters length')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens')
    .required('Username is required'),
  email: Yup.string()
    .email('Enter a valid email')
    .required('Email is required')
    .max(255, 'Email is too long'),
  currentPassword: Yup.string()
    .when('newPassword', {
      is: (val: string) => val && val.length > 0,
      then: (schema) => schema.required('Current password is required')
        .min(8, 'Password should be of minimum 8 characters length'),
      otherwise: (schema) => schema
    }),
  newPassword: Yup.string()
    .test('different', 'New password must be different from current password',
      function(value) {
        return !value || value !== this.parent.currentPassword;
      })
    .test('complexity', 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
      function(value) {
        if (!value) return true;
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(value);
      }),
  confirmPassword: Yup.string()
    .when('newPassword', {
      is: (val: string) => val && val.length > 0,
      then: (schema) => schema.required('Confirm password is required')
        .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
      otherwise: (schema) => schema
    })
});

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading, error: authError } = useSelector((state: RootState) => state.auth);
  const { items: notes } = useSelector((state: RootState) => state.notes);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik<ProfileFormValues>({
    initialValues: {
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError(null);
        setSuccess(null);
        
        const updates: Partial<User> = {};
        
        if (values.username !== user?.username) {
          updates.username = values.username;
        }
        if (values.email !== user?.email) {
          updates.email = values.email;
        }

        // Only dispatch update if there are profile changes
        if (Object.keys(updates).length > 0) {
          await dispatch(updateUser({
            id: user?.id || '',
            ...updates
          })).unwrap();
        }

        // Handle password update if new password is provided
        if (values.newPassword) {
          await authApi.updatePassword(values.currentPassword, values.newPassword);
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
        setError(err instanceof Error ? err.message : 'Failed to update profile');
        console.error('Failed to update profile:', err);
      }
    },
  });
  const calculateStats = () => {
    const totalNotes = notes.length;
    const now = new Date();
    const oldestNoteDate = notes.length > 0 
      ? new Date(Math.min(...notes.map(note => new Date(note.createdAt).getTime())))
      : now;
    
    const daysSinceFirstNote = Math.max(1, Math.ceil((now.getTime() - oldestNoteDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      totalNotes,
      lastActive: user?.lastActive 
        ? new Date(user.lastActive).toLocaleDateString() 
        : now.toLocaleDateString(),
      averageNotesPerDay: (totalNotes / daysSinceFirstNote).toFixed(1)
    };
  };

  const stats = calculateStats();

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

              {authError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {authError}
                </Alert>
              )}

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
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
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
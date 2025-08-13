import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Register from '../pages/auth/Register';
import Login from '../pages/auth/Login';
import { AuthProvider } from '../contexts/AuthContext';

// Don't mock the API for integration tests - use real backend
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (component) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {component}
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Generate unique test data for each test run
const generateTestUser = () => {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'testpassword123'
  };
};

describe('Authentication Integration Tests', () => {
  let user;
  let testUser;

  beforeEach(() => {
    user = userEvent.setup();
    testUser = generateTestUser();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Full Registration Flow', () => {
    it('should complete registration flow with email verification', async () => {
      renderWithProviders(<Register />);
      
      // Fill out registration form
      await user.type(screen.getByPlaceholderText('Enter your full name'), testUser.name);
      await user.type(screen.getByPlaceholderText('Enter your email'), testUser.email);
      await user.type(screen.getByPlaceholderText('Create a password'), testUser.password);
      await user.type(screen.getByPlaceholderText('Confirm your password'), testUser.password);
      
      // Submit registration
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Wait for success message and OTP form to appear
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
        expect(screen.getByText('Verify your email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter OTP')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Note: In a real test environment, you would need to:
      // 1. Have access to the OTP (either through test email service or database)
      // 2. Enter the OTP and verify
      // For now, we'll just verify that the OTP form appears
      expect(screen.getByRole('button', { name: /verify otp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();
    }, 15000);

    it('should show error for duplicate email registration', async () => {
      // First, register a user
      renderWithProviders(<Register />);
      
      await user.type(screen.getByPlaceholderText('Enter your full name'), testUser.name);
      await user.type(screen.getByPlaceholderText('Enter your email'), testUser.email);
      await user.type(screen.getByPlaceholderText('Create a password'), testUser.password);
      await user.type(screen.getByPlaceholderText('Confirm your password'), testUser.password);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Wait for first registration to complete
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Now try to register with the same email again
      // Re-render the component to simulate a fresh registration attempt
      const { unmount } = renderWithProviders(<Register />);
      unmount();
      
      renderWithProviders(<Register />);
      
      await user.type(screen.getByPlaceholderText('Enter your full name'), 'Another User');
      await user.type(screen.getByPlaceholderText('Enter your email'), testUser.email);
      await user.type(screen.getByPlaceholderText('Create a password'), 'anotherpassword123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'anotherpassword123');
      
      const submitButton2 = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton2);

      // Should show error for duplicate email
      await waitFor(() => {
        expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 20000);
  });

  describe('Login Flow', () => {
    it('should show error for non-existent user', async () => {
      renderWithProviders(<Login />);
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'nonexistent@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 15000);

    it('should show error for unverified email', async () => {
      // First register a user (but don't verify email)
      renderWithProviders(<Register />);
      
      await user.type(screen.getByPlaceholderText('Enter your full name'), testUser.name);
      await user.type(screen.getByPlaceholderText('Enter your email'), testUser.email);
      await user.type(screen.getByPlaceholderText('Create a password'), testUser.password);
      await user.type(screen.getByPlaceholderText('Confirm your password'), testUser.password);
      
      const registerButton = screen.getByRole('button', { name: /create account/i });
      await user.click(registerButton);

      // Wait for registration to complete
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Now try to login without verifying email
      const { unmount } = renderWithProviders(<Login />);
      unmount();
      
      renderWithProviders(<Login />);
      
      await user.type(screen.getByPlaceholderText('Enter your email'), testUser.email);
      await user.type(screen.getByPlaceholderText('Enter your password'), testUser.password);
      
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/please verify your email/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 20000);
  });
});

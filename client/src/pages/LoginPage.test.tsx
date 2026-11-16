import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';
import { renderWithProviders } from '@/test/utils';
import { ApiError } from '@/services/api';

const loginMock = vi.fn();
const navigateMock = vi.fn();

// The page is tested in isolation from the real auth stack and router.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isAdmin: false,
    login: loginMock,
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it('renders the sign-in form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('blocks submission and shows messages when fields are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email address', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits valid credentials and redirects', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({ id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'CUSTOMER' });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'Password1',
      });
    });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('shows a neutral error that does not reveal which field was wrong', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(
      new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid email or password', status: 401 }),
    );

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password.');
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

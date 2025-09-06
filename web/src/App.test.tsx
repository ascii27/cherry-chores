import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import App from './App';

describe('Landing page', () => {
  it('renders parent and child sign-in UI', async () => {
    render(<App />);
    const user = userEvent.setup();
    // Open parent dialog and check Google sign-in button exists
    await user.click(screen.getByRole('button', { name: /parent sign in/i }));
    expect(screen.getByRole('button', { name: /parent sign in with google/i })).toBeInTheDocument();
    // Close and open child dialog, then check child sign-in form exists
    await user.click(screen.getByRole('button', { name: /close/i }));
    await user.click(screen.getByRole('button', { name: /child sign in/i }));
    expect(screen.getByRole('form', { name: /child sign in form/i })).toBeInTheDocument();
  });
});

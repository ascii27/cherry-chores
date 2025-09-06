import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('Landing page', () => {
  it('renders parent and child sign-in UI', () => {
    render(<App />);
    // Open parent dialog and check Google sign-in button exists
    fireEvent.click(screen.getByRole('button', { name: /parent sign in/i }));
    expect(screen.getByRole('button', { name: /parent sign in with google/i })).toBeInTheDocument();
    // Close and open child dialog, then check child sign-in form exists
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.click(screen.getByRole('button', { name: /child sign in/i }));
    expect(screen.getByRole('form', { name: /child sign in form/i })).toBeInTheDocument();
  });
});

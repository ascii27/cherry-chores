import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('Landing page', () => {
  it('renders parent and child sign-in UI', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /parent sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: /child sign in form/i })).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('Landing page', () => {
  it('renders primary CTA', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
  });
});


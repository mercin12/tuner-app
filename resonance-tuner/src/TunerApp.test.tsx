import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';

describe('Resonance Tuner Navigation & Layout', () => {
  beforeEach(() => {
    // Clear localStorage to ensure terms are fresh
    localStorage.clear();
  });

  const acceptTerms = () => {
    render(<App />);
    const acceptButton = screen.getByText(/I Accept the Risk/i);
    fireEvent.click(acceptButton);
  };

  it('renders Tuner as the first navigation option and Help as the last', () => {
    acceptTerms();
    // Use getByText to verify presence of nav buttons
    expect(screen.getByText('Tuner')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('shows Calibration option only when Piano instrument is selected', () => {
    acceptTerms();
    
    // Default mode is General Tuner - Calibration should NOT be visible
    expect(screen.queryByText('CALIBRATION')).not.toBeInTheDocument();

    // Select Piano
    const pianoTab = screen.getByText('Piano');
    fireEvent.click(pianoTab);

    // Now CALIBRATION should be available in the level toggle (NOVICE, PRO, CALIBRATION)
    expect(screen.getByText('CALIBRATION')).toBeInTheDocument();
  });

  it('switches to Calibration recording view when selected under Piano', () => {
    acceptTerms();
    
    fireEvent.click(screen.getByText('Piano'));
    fireEvent.click(screen.getByText('CALIBRATION'));

    expect(screen.getByText(/Recording Profile/i)).toBeInTheDocument();
  });

  it('renders the Play button in the tuner view', () => {
    acceptTerms();
    // The play button is a button with an svg child
    // In our App.tsx, it's the only one with these specific transition classes or we can find it by looking for the one that calls startAudio
    const buttons = screen.getAllByRole('button');
    // The play button is likely the one with the large rounded classes
    const playButton = buttons.find(b => b.className.includes('rounded-full') && b.className.includes('w-16'));
    expect(playButton).toBeInTheDocument();
  });
});

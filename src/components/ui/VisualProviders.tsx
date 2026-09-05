import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import * as Tooltip from '@radix-ui/react-tooltip';

const visualPlayerTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f59e0b' },
    secondary: { main: '#06b6d4' },
    success: { main: '#10b981' },
    error: { main: '#f43f5e' },
    background: {
      default: '#090a0f',
      paper: '#111827',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'Outfit, system-ui, sans-serif',
    button: {
      fontWeight: 800,
      textTransform: 'none',
    },
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const VisualProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={visualPlayerTheme}>
    <Tooltip.Provider delayDuration={220} skipDelayDuration={80}>
      {children}
    </Tooltip.Provider>
  </ThemeProvider>
);

import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
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
    <CssBaseline />
    <GlobalStyles
      styles={{
        ':root': {
          colorScheme: 'dark',
          WebkitTapHighlightColor: 'transparent',
        },
        '::selection': {
          background: 'rgba(245, 158, 11, 0.34)',
          color: '#fff7ed',
        },
        '*': {
          scrollbarColor: 'rgba(251, 191, 36, 0.42) rgba(15, 23, 42, 0.66)',
        },
        '*::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        '*::-webkit-scrollbar-track': {
          background: 'rgba(15, 23, 42, 0.66)',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(251, 191, 36, 0.36)',
          border: '2px solid rgba(15, 23, 42, 0.66)',
          borderRadius: 999,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(251, 191, 36, 0.54)',
        },
      }}
    />
    <Tooltip.Provider delayDuration={220} skipDelayDuration={80}>
      {children}
    </Tooltip.Provider>
  </ThemeProvider>
);

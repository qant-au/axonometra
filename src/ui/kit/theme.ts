import {
  createTheme,
  type PaletteMode,
  type ThemeOptions
} from '@mui/material';

// Axonometra's look (one UI library, MUI, with the common parts here).

export interface CustomThemeVars {
  appPadding: { x: number; y: number };
  toolMenu: { height: number };
  customPalette: { [key in string]: string };
}

declare module '@mui/material/styles' {
  interface Theme {
    customVars: CustomThemeVars;
  }

  interface ThemeOptions {
    customVars?: CustomThemeVars;
  }
}

export const axonometraVars = (
  mode: PaletteMode = 'light'
): CustomThemeVars => {
  const isDark = mode === 'dark';
  return {
    appPadding: { x: 40, y: 40 },
    toolMenu: { height: 40 },
    customPalette: {
      diagramBg: isDark ? '#1a1d24' : '#f6faff',
      defaultColor: isDark ? '#5b6ab1' : '#a5b8f3'
    }
  };
};

// Dark mode wants deeper shadows so popovers read against the darker canvas.
const createShadows = (mode: PaletteMode) => {
  const alpha = mode === 'dark' ? 0.5 : 0.25;
  return Array(25)
    .fill('none')
    .map((_shadow, i) =>
      i === 0 ? 'none' : `0px 10px 20px ${i - 10}px rgba(0,0,0,${alpha})`
    ) as Required<ThemeOptions>['shadows'];
};

// The theme as options, for a host that builds its own theme on top.
export const axonometraThemeOptions = (
  mode: PaletteMode = 'light'
): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    customVars: axonometraVars(mode),
    shadows: createShadows(mode),
    typography: {
      h2: { fontSize: '4em', fontWeight: 'bold', lineHeight: 1.2 },
      h5: { fontSize: '1.3em', lineHeight: 1.2 },
      body1: { fontSize: '0.85em', lineHeight: 1.2 },
      body2: { fontSize: '0.75em', lineHeight: 1.2 }
    },
    palette: {
      mode,
      secondary: { main: '#df004c' },
      background: {
        default: isDark ? '#1a1d24' : '#fff',
        paper: isDark ? '#252a33' : '#fff'
      }
    },
    components: {
      MuiCard: {
        defaultProps: { elevation: 0, variant: 'outlined' }
      },
      MuiToolbar: {
        styleOverrides: {
          root: { backgroundColor: isDark ? '#252a33' : 'white' }
        }
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: true, disableTouchRipple: true }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
          variant: 'contained',
          disableRipple: true,
          disableTouchRipple: true
        },
        styleOverrides: { root: { textTransform: 'none' } }
      },
      MuiSvgIcon: {
        defaultProps: { color: 'action' },
        styleOverrides: { root: { width: 17, height: 17 } }
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' }
      }
    }
  };
};

export interface AxonometraThemeSettings {
  // Expose the palette as --mui-* CSS variables, for plain CSS modules. Off
  // by default: MUI writes them to :root, which an embedded component must
  // not do to its host page.
  cssVariables?: boolean;
}

export const createAxonometraTheme = (
  mode: PaletteMode = 'light',
  { cssVariables = false }: AxonometraThemeSettings = {}
) => createTheme({ ...axonometraThemeOptions(mode), cssVariables });

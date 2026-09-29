import { createTheme } from '@mui/material';
export const lineworkVars = (mode = 'light') => {
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
const createShadows = (mode) => {
    const alpha = mode === 'dark' ? 0.5 : 0.25;
    return Array(25)
        .fill('none')
        .map((_shadow, i) => i === 0 ? 'none' : `0px 10px 20px ${i - 10}px rgba(0,0,0,${alpha})`);
};
// The theme as options, for a host that builds its own theme on top.
export const lineworkThemeOptions = (mode = 'light') => {
    const isDark = mode === 'dark';
    return {
        customVars: lineworkVars(mode),
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
export const createLineworkTheme = (mode = 'light', { cssVariables = false } = {}) => createTheme({ ...lineworkThemeOptions(mode), cssVariables });

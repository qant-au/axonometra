import { type PaletteMode } from '@mui/material';
export interface CustomThemeVars {
    appPadding: {
        x: number;
        y: number;
    };
    toolMenu: {
        height: number;
    };
    customPalette: {
        [key in string]: string;
    };
}
declare module '@mui/material/styles' {
    interface Theme {
        customVars: CustomThemeVars;
    }
    interface ThemeOptions {
        customVars?: CustomThemeVars;
    }
}
export declare const createLineworkTheme: (mode?: PaletteMode) => import("@mui/material").Theme;

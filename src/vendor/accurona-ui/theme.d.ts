import { type PaletteMode, type ThemeOptions } from '@mui/material';
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
export declare const lineworkVars: (mode?: PaletteMode) => CustomThemeVars;
export declare const lineworkThemeOptions: (mode?: PaletteMode) => ThemeOptions;
export interface LineworkThemeSettings {
    cssVariables?: boolean;
}
export declare const createLineworkTheme: (mode?: PaletteMode, { cssVariables }?: LineworkThemeSettings) => import("@mui/material").Theme;

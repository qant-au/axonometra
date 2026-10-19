import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { AppDialog } from './AppDialog';
import { keyNames, shortcutKeys, type ShortcutPart } from './shortcutKeys';

// The shapes src/core/keymap.ts's shortcutSections() and DIFFERENCES produce;
// restated here so the UI package does not depend on the core one.
export interface KeyboardShortcutSection {
  title: string;
  rows: { label: string; keys: string[] }[];
}

export interface KeyboardShortcutDifference {
  excalidraw: string;
  action: string;
  here: string;
  why: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sections: KeyboardShortcutSection[];
  differences?: readonly KeyboardShortcutDifference[];
  title?: string;
}

const Kbd = ({ children }: { children: string }) => (
  <Box
    component="kbd"
    sx={{
      fontFamily: 'inherit',
      fontSize: '0.8125rem',
      px: 0.75,
      py: 0.125,
      borderRadius: 1,
      border: 1,
      borderColor: 'divider',
      bgcolor: 'action.hover',
      whiteSpace: 'nowrap'
    }}
  >
    {children}
  </Box>
);

const Joiner = ({ children }: { children: string }) => (
  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
    {children}
  </Box>
);

const Words = ({ children }: { children: string }) => (
  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
    {children}
  </Box>
);

// One +-joined part of a chord or gesture: a key, or a key and words.
const Part = ({ part }: { part: ShortcutPart[] }) => (
  <>
    {part.map((piece, i) =>
      'key' in piece ? (
        <Kbd key={i}>{piece.key}</Kbd>
      ) : (
        <Words key={i}>{piece.text}</Words>
      )
    )}
  </>
);

// Each entry is one way to trigger the action, so entries are separated by
// "or"; the keys of one chord are joined by "+". Without that, "V 1 S" and
// "⌘ ⇧ Z" were drawn alike and read as one combination (BUG15-14). A
// pointer gesture draws its keys as keys too ("⇧ + Click"), as the keyboard
// rows do: they were a mix of chips and plain text (sweep 2026-09-30). A
// row of chords keeps its alternatives on one line beside the label: wrapped,
// the second one started a line with "or" (on a phone they may wrap under
// the label). A row with words in it may wrap, and then "or" starts the
// line with the alternative it introduces: ending the line, it dangled
// there with the label centred between the two (sweep 2026-09-30, round 3).
const Keys = ({ keys }: { keys: string[] }) => {
  const entries = keys.map((entry) => ({ entry, parsed: shortcutKeys(entry) }));
  const chordsOnly = entries.every((e) => e.parsed.kind === 'chord');
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        flexWrap: chordsOnly ? { xs: 'wrap', sm: 'nowrap' } : 'wrap',
        alignItems: 'center',
        gap: 0.5,
        justifyContent: { xs: 'flex-start', sm: 'flex-end' }
      }}
    >
      {entries.map(({ entry, parsed }, i) => {
        const parts: ShortcutPart[][] =
          parsed.kind === 'chord'
            ? parsed.keys.map((key) => [{ key }])
            : parsed.kind === 'gesture'
              ? parsed.parts
              : [];
        return (
          <Box
            component="span"
            key={entry}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              whiteSpace: 'nowrap'
            }}
          >
            {i > 0 && <Joiner>or</Joiner>}
            {parsed.kind === 'text' ? (
              <Box
                component="span"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8125rem',
                  whiteSpace: 'normal'
                }}
              >
                {parsed.text}
              </Box>
            ) : (
              parts.map((part, j) => (
                <Box
                  component="span"
                  key={j}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  {j > 0 && <Joiner>+</Joiner>}
                  <Part part={part} />
                </Box>
              ))
            )}
          </Box>
        );
      })}
    </Box>
  );
};

// On a phone the keys go under their label rather than beside it, where
// they were pushed off the dialog's right edge.
const rowSx = {
  display: { xs: 'block', sm: 'table-row' },
  borderBottom: { xs: 1, sm: 0 },
  borderColor: 'divider',
  py: { xs: 0.75, sm: 0 }
};
// Top-aligned, so a label beside keys that wrap stays level with their
// first line instead of sitting between the two.
const labelCellSx = {
  display: { xs: 'block', sm: 'table-cell' },
  verticalAlign: 'top',
  borderBottom: { xs: 0 },
  p: { xs: 0 },
  pb: { xs: 0.5 }
};
// Up to half the width beside the label, so a long phrase wraps instead of
// squeezing the label to a word a line.
const keysCellSx = {
  display: { xs: 'block', sm: 'table-cell' },
  verticalAlign: 'top',
  borderBottom: { xs: 0 },
  p: { xs: 0 },
  width: { sm: '50%' },
  textAlign: { xs: 'left', sm: 'right' }
};

// On a phone each difference is a block, its columns one under another with
// their headings inline: as three columns they were 80-100px wide each.
// Only on a phone: `{ xs: 0 }` applies from xs up, so it also took the
// desktop table's cell padding and row dividers (sweep 2026-09-30, round 4).
const diffCellSx = {
  display: { xs: 'block', sm: 'table-cell' },
  '@media (max-width: 599.95px)': { borderBottom: 0, p: 0, pb: 0.25 }
};

const DiffHeading = ({ children }: { children: string }) => (
  <Box
    component="span"
    sx={{ display: { xs: 'inline', sm: 'none' }, color: 'text.secondary' }}
  >
    {children}
  </Box>
);

// The `?` dialog: every binding a tool has, from the shared keymap, and the
// Excalidraw bindings it deliberately does not match.
export const KeyboardShortcutsDialog = ({
  open,
  onClose,
  sections,
  differences,
  title = 'Keyboard shortcuts'
}: Props) => (
  <AppDialog open={open} onClose={onClose} title={title} maxWidth="md">
    <Stack spacing={3} data-testid="keyboard-shortcuts">
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }
        }}
      >
        {sections.map((section) => (
          <Box
            key={section.title}
            component="section"
            aria-label={section.title}
          >
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
              {section.title}
            </Typography>
            <Table size="small">
              <TableBody>
                {section.rows.map((row) => (
                  <TableRow key={`${row.label}:${row.keys.join()}`} sx={rowSx}>
                    <TableCell sx={{ pl: 0, ...labelCellSx }}>
                      {row.label}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 0, ...keysCellSx }}>
                      <Keys keys={row.keys} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ))}
      </Box>
      {differences && differences.length > 0 && (
        <Box
          component="section"
          aria-label="Differences from Excalidraw"
          data-testid="excalidraw-differences"
        >
          <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
            Differences from Excalidraw
          </Typography>
          <Table size="small">
            <TableHead
              sx={{ display: { xs: 'none', sm: 'table-header-group' } }}
            >
              <TableRow>
                <TableCell sx={{ pl: 0 }}>Excalidraw</TableCell>
                <TableCell>Here</TableCell>
                <TableCell sx={{ pr: 0 }}>Why</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {differences.map((d) => (
                <TableRow key={d.excalidraw + d.action} sx={rowSx}>
                  <TableCell
                    sx={{
                      pl: 0,
                      ...diffCellSx,
                      fontWeight: { xs: 500, sm: 'inherit' }
                    }}
                  >
                    {keyNames(d.excalidraw)} ({d.action})
                  </TableCell>
                  <TableCell sx={diffCellSx}>
                    <DiffHeading>Here: </DiffHeading>
                    {keyNames(d.here)}
                  </TableCell>
                  <TableCell sx={{ pr: 0, ...diffCellSx }}>
                    <DiffHeading>Why: </DiffHeading>
                    {d.why}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  </AppDialog>
);

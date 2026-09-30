import { useMemo } from 'react';
import { Autocomplete, Paper, TextField } from '@mui/material';
import { useStore } from '../stores/EditorStore';
import { useInstance } from '../editor/instance/context';
import { getItemName } from '../res/catalog';
import { Tool } from '../editor/editor/constants';
import { ChangeFloorAction } from '../editor/editor/actions/ChangeFloorAction';

interface Found {
  key: string;
  label: string;
  floor: number;
  id: number;
}

// Ctrl/Cmd + F: find a placed item by name on any floor. Choosing one goes
// to its floor, selects it and brings it into view.
function FindBox() {
  const inst = useInstance();
  const setOpen = useStore((s) => s.setFindOpen);
  const options = useMemo(() => {
    const found: Found[] = [];
    inst.plan.getState().floors.forEach((floor, index) => {
      for (const [id, item] of floor?.getFurniture() ?? []) {
        found.push({
          key: `${index}:${id}`,
          label: getItemName(item.resourcePath),
          floor: index,
          id
        });
      }
    });
    return found.sort(
      (a, b) => a.floor - b.floor || a.label.localeCompare(b.label)
    );
  }, [inst]);

  const choose = (item: Found | null) => {
    setOpen(false);
    if (!item) return;
    const by = item.floor - inst.plan.getState().currentFloor;
    if (by !== 0) new ChangeFloorAction(inst, by).execute();
    inst.editor.getState().setTool(Tool.Edit);
    inst.selection.getState().set([{ kind: 'furniture', id: item.id }]);
    inst.commands.fitSelection();
  };

  return (
    <Paper
      elevation={4}
      // Esc closes it even with the list shut, when Autocomplete ignores it.
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
      sx={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(360px, calc(100vw - 32px))',
        zIndex: 20,
        p: 1
      }}
    >
      <Autocomplete
        openOnFocus
        autoHighlight
        size="small"
        options={options}
        getOptionKey={(o) => o.key}
        groupBy={(o) => `Floor ${o.floor}`}
        noOptionsText="Nothing on the plan by that name"
        onChange={(_e, value) => choose(value)}
        onClose={(_e, reason) => {
          if (reason === 'escape' || reason === 'blur') setOpen(false);
        }}
        renderInput={(params) => (
          <TextField {...params} autoFocus label="Find on the plan" />
        )}
      />
    </Paper>
  );
}

export function FindBar() {
  const open = useStore((s) => s.findOpen);
  return open ? <FindBox /> : null;
}

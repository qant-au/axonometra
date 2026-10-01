import { Box, Card, CardActionArea, Typography } from '@mui/material';
import {
  getFurnitureForElement,
  getItemName,
  resolveCatalogImage
} from '../../../res/catalog';
import { AddFurnitureAction } from '../../../editor/editor/actions/AddFurnitureAction';
import { placedOnlyElsewhere } from '../../../editor/editor/persistence/crossover';
import { useInstance } from '../../../editor/instance/context';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { METER } from '../../../editor/editor/constants';

// Devices in a network diagram (Reticulyne) that are not on the floor
// plan yet. Placing one keeps its scene object id, so the item on the plan and
// the node in the diagram are one object. Only objects with an Accurona element
// can be drawn on a plan; the rest (a cloud service, a VPN link) never are.
export function DiagramObjects() {
  const inst = useInstance();
  // Re-read on every add, undo and load: each changes the plan's floors or
  // its furniture counter.
  useFloorPlanStore((s) => s.floors);
  useFloorPlanStore((s) => s.furnitureId);

  const serializer = inst.serializer;
  const objects = placedOnlyElsewhere(serializer.openedScene(), ['plan'])
    .filter((o) => !serializer.isOnPlan(o.id))
    .flatMap((o) => {
      const data = o.element ? getFurnitureForElement(o.element) : undefined;
      return data ? [{ object: o, data }] : [];
    });

  if (!objects.length || inst.config.readOnly) return null;

  return (
    <Box data-testid="diagram-objects" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        From the network diagram
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        In a diagram, not on the plan yet. Placing one links it to the node.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 2,
          p: 0.5
        }}
      >
        {objects.map(({ object, data }) => {
          const name = object.name ?? getItemName(data.imagePath);
          return (
            <Card key={object.id}>
              <CardActionArea
                onClick={() => {
                  // Beside anything already in the middle of the view,
                  // not on top of it.
                  const at = inst.commands.freeSpot(
                    data.width * METER,
                    data.height * METER
                  );
                  new AddFurnitureAction(inst, data, undefined, at).execute();
                  serializer.linkFurniture(
                    inst.plan.getState().furnitureId,
                    object.id
                  );
                }}
                sx={{ p: 1 }}
              >
                <Box
                  component="img"
                  src={resolveCatalogImage(data.imagePath)}
                  alt={name}
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: 115,
                    objectFit: 'contain'
                  }}
                />
                <Typography
                  sx={{ textAlign: 'center', fontWeight: 500, mt: 1 }}
                >
                  {name}
                </Typography>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

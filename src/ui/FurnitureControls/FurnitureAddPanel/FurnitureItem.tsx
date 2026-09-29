import { Box, Card, CardActionArea, Typography } from '@mui/material';
import { resolveCatalogImage } from '../../../api/api-client';
import { AddFurnitureAction } from '../../../editor/editor/actions/AddFurnitureAction';
import { FurnitureData } from '../../../stores/FurnitureStore';

interface IFurnitureData {
  data: FurnitureData;
}

function add(item: IFurnitureData) {
  const action = new AddFurnitureAction(item.data);
  action.execute();
}

export function FurnitureItem(item: IFurnitureData) {
  const data = item.data;
  return (
    <Card>
      <CardActionArea onClick={() => add(item)} sx={{ p: 1 }}>
        <Box
          component="img"
          src={resolveCatalogImage(data.imagePath)}
          alt={data.name}
          sx={{
            display: 'block',
            width: '100%',
            height: 115,
            objectFit: 'contain'
          }}
        />
        <Typography sx={{ textAlign: 'center', fontWeight: 500, mt: 1 }}>
          {data.name}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

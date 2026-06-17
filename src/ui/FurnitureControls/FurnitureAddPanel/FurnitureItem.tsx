import { Card, Center, Image, Text } from '@mantine/core';
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
    <Card onClick={() => add(item)} shadow="sm" p="lg">
      <Card.Section style={{ height: 120, padding: 5 }}>
        <Center>
          <Image
            src={resolveCatalogImage(data.imagePath)}
            fit="contain"
            height={115}
            alt={data.name}
          />
        </Center>
      </Card.Section>
      <Card.Section>
        <Center>
          <Text ta="center" fw={500}>
            {data.name}
          </Text>
        </Center>
      </Card.Section>
    </Card>
  );
}

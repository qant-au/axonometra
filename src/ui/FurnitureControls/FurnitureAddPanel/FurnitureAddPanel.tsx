import { Box, ScrollArea, Select, SimpleGrid } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FurnitureItem } from './FurnitureItem';
import { useFurnitureStore } from '../../../stores/FurnitureStore';
import { notifications } from '@mantine/notifications';

export function FurnitureAddPanel() {
  const [category, setCategory] = useState('');
  const categories = useFurnitureStore((s) => s.categories);
  const currentFurnitureData = useFurnitureStore((s) => s.currentFurnitureData);

  // when a category is selected by user, load its furniture elements from API
  useEffect(() => {
    if (category) {
      useFurnitureStore.getState().getCurrentFurnitureData(category);
    }
  }, [category]);

  // on first load, select default category
  useEffect(() => {
    if (categories && categories[0] && categories[0]._id) {
      setCategory(categories[0]._id);
    } else {
      notifications.show({
        message: 'Check your internet connection',
        color: 'green'
      });
    }
  }, [categories]);

  return (
    <>
      <Box>
        <Select
          my="xs"
          value={category}
          onChange={(value) => setCategory(value ?? '')}
          data={categories.map((cat) => {
            return { value: cat._id, label: cat.name };
          })}
        />
      </Box>
      <Box style={{ height: '100%' }} mx="-xs" px="xs">
        <ScrollArea style={{ width: '320', height: '90%' }}>
          <SimpleGrid style={{ padding: 5 }} cols={2}>
            {currentFurnitureData.map((item) => (
              <FurnitureItem data={item} key={item._id}></FurnitureItem>
            ))}
          </SimpleGrid>
        </ScrollArea>
      </Box>
    </>
  );
}

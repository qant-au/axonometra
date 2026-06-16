import {
  createStyles,
  Navbar,
  ScrollArea,
  Select,
  SimpleGrid
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { FurnitureItem } from './FurnitureItem';
import { useFurnitureStore } from '../../../stores/FurnitureStore';
import { showNotification } from '@mantine/notifications';
const useStyles = createStyles((theme) => ({
  mb: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs
  }
}));

export function FurnitureAddPanel() {
  const { classes } = useStyles();
  const [category, setCategory] = useState('');
  const { categories, currentFurnitureData } = useFurnitureStore();

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
      showNotification({
        message: 'Check your internet connection',
        color: 'green'
      });
    }
  }, [categories]);

  return (
    <>
      <Navbar.Section>
        <Select
          className={classes.mb}
          value={category}
          onChange={(value) => setCategory(value ?? '')}
          data={categories.map((cat) => {
            return { value: cat._id, label: cat.name };
          })}
        />
      </Navbar.Section>
      <Navbar.Section style={{ height: '100%' }} grow mx="-xs" px="xs">
        <ScrollArea style={{ width: '320', height: '90%' }}>
          <SimpleGrid style={{ padding: 5 }} cols={2}>
            {currentFurnitureData.map((item) => (
              <FurnitureItem data={item} key={item._id}></FurnitureItem>
            ))}
          </SimpleGrid>
        </ScrollArea>
      </Navbar.Section>
    </>
  );
}

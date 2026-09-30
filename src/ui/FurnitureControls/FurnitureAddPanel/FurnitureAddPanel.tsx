import { Box, MenuItem, Select } from '@mui/material';
import { useEffect, useState } from 'react';
import { FurnitureItem } from './FurnitureItem';
import { useFurnitureStore } from '../../../stores/FurnitureStore';
import { useInstance } from '../../../editor/instance/context';

export function FurnitureAddPanel() {
  const inst = useInstance();
  const categories = useFurnitureStore((s) => s.categories);
  // The user's pick, falling back to the first category until they choose.
  const [pickedCategory, setCategory] = useState('');
  const category = pickedCategory || categories[0]?._id || '';
  const currentFurnitureData = useFurnitureStore((s) => s.currentFurnitureData);

  // when a category is selected by user, load its furniture elements from API
  useEffect(() => {
    if (category) {
      inst.furniture.getState().getCurrentFurnitureData(category);
    }
  }, [inst, category]);

  useEffect(() => {
    if (!categories[0]?._id) {
      inst.notify({
        message: 'Check your internet connection',
        severity: 'warning'
      });
    }
  }, [inst, categories]);

  return (
    <>
      <Select
        fullWidth
        size="small"
        sx={{ my: 1 }}
        value={categories.length ? category : ''}
        onChange={(e) => setCategory(e.target.value)}
        inputProps={{ 'aria-label': 'Category' }}
      >
        {categories.map((cat) => (
          <MenuItem key={cat._id} value={cat._id}>
            {cat.name}
          </MenuItem>
        ))}
      </Select>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 2,
          p: 0.5
        }}
      >
        {currentFurnitureData.map((item) => (
          <FurnitureItem data={item} key={item._id}></FurnitureItem>
        ))}
      </Box>
    </>
  );
}

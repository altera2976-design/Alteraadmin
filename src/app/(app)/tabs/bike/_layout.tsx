import { Stack } from 'expo-router';

export default function BikeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Work History',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}

import { Redirect } from 'expo-router';

// Default redirect — root layout will handle the actual auth redirect
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}

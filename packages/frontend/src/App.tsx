import { QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes/AppRoutes';
import { queryClient } from './lib/query-client';

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
};
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import ReadyToBuyPage from './ReadyToBuyPage';

export default function ReadyToBuyPageWithProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReadyToBuyPage />
    </QueryClientProvider>
  );
}

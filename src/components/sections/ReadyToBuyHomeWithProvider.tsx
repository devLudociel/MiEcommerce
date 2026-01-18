import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import ReadyToBuyHome from './ReadyToBuyHome';

interface ReadyToBuyHomeWithProviderProps {
  maxItems?: number;
}

export default function ReadyToBuyHomeWithProvider({
  maxItems = 6,
}: ReadyToBuyHomeWithProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReadyToBuyHome maxItems={maxItems} />
    </QueryClientProvider>
  );
}

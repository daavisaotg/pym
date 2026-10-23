import { RouterProvider } from '@/router/router';
import { AppRoutes } from '@/router/routes';
import { SearchProvider } from '@/components/search/SearchProvider';
import { Layout } from '@/components/layout/Layout';

export function App() {
  return (
    <RouterProvider>
      <SearchProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </SearchProvider>
    </RouterProvider>
  );
}

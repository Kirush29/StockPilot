import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BranchCategoryInsights } from './BranchCategoryInsights';

describe('BranchCategoryInsights categories', () => {
  it('uses the category master list as the source of truth and merges matching analytics', async () => {
    const user = userEvent.setup();

    render(
      <BranchCategoryInsights
        branches={[]}
        allBranches={[]}
        allCategories={[
          { categoryId: 'cat-auto', name: 'Automotive Supplies', isActive: true },
          { categoryId: 'cat-electronics', name: 'Electronics', isActive: true },
          { categoryId: 'cat-med', name: 'Medical Supplies', isActive: true },
        ]}
        categories={[
          { category: 'Automotive Supplies', revenue: 9200, unitsSold: 1, percentage: 24.2 },
          { category: 'Medical Supplies', revenue: 5163, unitsSold: 347, percentage: 13.6 },
          { category: 'Pharmaceuticals', revenue: 5738.24, unitsSold: 237, percentage: 15.1 },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(screen.getByText('Automotive Supplies')).toBeInTheDocument();
    expect(screen.getByText('Medical Supplies')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Rs. 0.00')).toBeInTheDocument();
    expect(screen.queryByText('Pharmaceuticals')).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('1 historical sales category');
  });
});

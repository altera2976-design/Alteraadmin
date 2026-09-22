import AdminAppLayout from '../layouts/AdminAppLayout';
import TransactionHistoryPage from '../../pages/TransactionHistoryPage';

export default function AdminTransactionsPage() {
  return <TransactionHistoryPage LayoutComponent={AdminAppLayout} />;
}

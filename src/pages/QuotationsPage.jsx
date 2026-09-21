import AdminLayout from '../layouts/AdminLayout';
import QuotationModule from '../components/QuotationModule';

export default function QuotationsPage() {
  return (
    <QuotationModule
      LayoutComponent={AdminLayout}
      title="Quotations & Invoicing Suite"
      basePath="/quotations"
    />
  );
}

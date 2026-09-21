import AdminAppLayout from '../layouts/AdminAppLayout';
import QuotationModule from '../../components/QuotationModule';

export default function AdminQuotationsPage({ subRoute = 'list', quotationId = null }) {
  return (
    <QuotationModule
      LayoutComponent={AdminAppLayout}
      title={
        subRoute === 'create'
          ? 'Create Quotation'
          : subRoute === 'edit'
          ? 'Edit Quotation'
          : subRoute === 'view'
          ? 'Quotation Preview'
          : 'Quotations & Proposals'
      }
      subRoute={subRoute}
      quotationId={quotationId}
      basePath="/admin/quotations"
    />
  );
}

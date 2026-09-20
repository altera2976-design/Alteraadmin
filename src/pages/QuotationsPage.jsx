import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';
import { buildQuotationHtml, formatDate, formatINR, printQuotation, utf8ToBase64 } from '../services/quotationWebPdf';

const DEFAULT_ROOMS = [
  'Modular Kitchen',
  'Modular Wardrobes',
  'Furniture',
  'Vanity',
  'Study Table',
  'Modular Doors',
  'Crockery Unit',
  'TV Unit',
  'Others',
  'Custom',
  '+ Add More',
];

const DEFAULT_CATEGORY_SUB_ITEMS = {
  'Modular Kitchen': [
    'Acrylic Finish Kitchen',
    'PU Finish Kitchen',
    'Laminate Finish Kitchen',
    'Veneer Finish Kitchen',
    'Glass Shutter Kitchen',
    'Handleless Profile Kitchen',
    '+ Add More',
  ],
  'Modular Wardrobes': [
    'Laminated Wardrobes',
    'Lacquered Glass Wardrobes',
    'Italian Wardrobes',
    'PU Wardrobes',
    'PU European Wardrobes',
    'Veneer Wardrobes',
    '+ Add More',
  ],
  'Furniture': [
    'Modular Bed',
    'Modular Bed with Back Panel',
    'Modular Dresser',
    'Modern Dining Table with Chair',
    '+ Add More',
  ],
  'Vanity': [
    'Double Vanity',
    'Floating Vanity',
    'Modern Vanity',
    'Traditional Vanity',
    '+ Add More',
  ],
  'Study Table': [
    'Classic Modern Study Table',
    'Classic Veneer Study Table',
    'Contemporary Study Table',
    'Modern Study Table',
    '+ Add More',
  ],
  'Modular Doors': [
    'Classic Modern Door',
    'Classic Veneer Door',
    'Modular Contemporary Door',
    'Modular Metallic Door',
    'Modern Door',
    '+ Add More',
  ],
  'Crockery Unit': [
    'Classic Modern Bar and Unit',
    'Classic Modern Crockery Unit',
    'Classic Veneer Bar Unit',
    'Classic Veneer Crockery Unit',
    'Modern Bar Unit',
    'Modern Crockery Unit',
    '+ Add More',
  ],
  'TV Unit': [
    'Classic TV Unit',
    'Contemporary TV Unit',
    'European TV Unit',
    'Modern TV Unit',
    '+ Add More',
  ],
  'Others': [
    'Pooja Unit',
    'Shoe Rack',
    'Foyer Console',
    'Partition Screen',
    '+ Add More',
  ],
};

const DEFAULT_MATERIAL_OPTIONS = [
  'HDHMR Board – Action Tesa',
  'BWP Plywood – Century / Greenply',
  'MDF Board',
  'Particle Board',
  'Blockboard',
  'Veneer',
  'Laminate – Merino / Royale Touche',
  'Acrylic Sheet',
  'PVC / WPC Board',
  '+ Add More',
];

const DEFAULT_HARDWARE_OPTIONS = [
  'Hettich Soft Close',
  'Hafele Soft Close',
  'Ebco Soft Close',
  'Blum Soft Close',
  'Standard Hardware',
  '+ Add More',
];

const DEFAULT_ACCESSORY_OPTIONS = [
  'Wicker Basket',
  'BPO (Bottle Pull Out)',
  'Innotech Drawers',
  'Tandem Box',
  'Corner Carousel',
  'Cutlery Tray',
  'Pantry Unit',
  '+ Add More',
];

const DEFAULT_MILESTONES = [
  { milestoneName: 'Booking Token', percentage: 10, amount: 0, stage: 'Initial layout & survey' },
  { milestoneName: 'Design & 3D Finalization', percentage: 20, amount: 0, stage: '3D renders & material approval' },
  { milestoneName: 'Civil & Material Procurement', percentage: 25, amount: 0, stage: 'Civil work & raw materials' },
  { milestoneName: 'Modular Factory Production', percentage: 20, amount: 0, stage: 'Factory fabrication of carcasses' },
  { milestoneName: 'Installation & Finishing', percentage: 20, amount: 0, stage: 'Onsite assembly & hardware fit' },
  { milestoneName: 'Final Handover & Snagging', percentage: 5, amount: 0, stage: 'Quality audit & handover' },
];

export default function QuotationsPage() {
  const [activeTab, setActiveTab] = useState('quotations'); // 'quotations', 'revisions', 'invoices'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form Step in Creator (1: Client/Project, 2: Rooms/Items, 3: Pricing/GST, 4: Milestones/Save)
  const [formStep, setFormStep] = useState(1);
  const [editingQuotationId, setEditingQuotationId] = useState(null);

  // Step 1 Form
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectType, setProjectType] = useState('Residential Interior');
  const [siteLocation, setSiteLocation] = useState('');

  // Step 2 Form
  const [roomCategories, setRoomCategories] = useState(DEFAULT_ROOMS);
  const [subItemMap, setSubItemMap] = useState(DEFAULT_CATEGORY_SUB_ITEMS);
  const [selectedRoom, setSelectedRoom] = useState('Modular Kitchen');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [showCustomSubItemInput, setShowCustomSubItemInput] = useState(false);
  const [customSubItemName, setCustomSubItemName] = useState('');
  const [items, setItems] = useState([]);
  // Item Sub-form
  const DEFAULT_UNITS = ['Sq Ft', 'Lumpsum', 'Pieces', '+ Add More'];
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [customUnitName, setCustomUnitName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnit, setItemUnit] = useState('Sq Ft');
  const [itemSize, setItemSize] = useState('1');
  const [itemRate, setItemRate] = useState('');
  const [materialOptions, setMaterialOptions] = useState(DEFAULT_MATERIAL_OPTIONS);
  const [showCustomMaterialInput, setShowCustomMaterialInput] = useState(false);
  const [customMaterialName, setCustomMaterialName] = useState('');

  const [hardwareOptions, setHardwareOptions] = useState(DEFAULT_HARDWARE_OPTIONS);
  const [showCustomHardwareInput, setShowCustomHardwareInput] = useState(false);
  const [customHardwareName, setCustomHardwareName] = useState('');

  const [accessoryOptions, setAccessoryOptions] = useState(DEFAULT_ACCESSORY_OPTIONS);
  const [showCustomAccessoryInput, setShowCustomAccessoryInput] = useState(false);
  const [customAccessoryName, setCustomAccessoryName] = useState('');

  const [specCarcass, setSpecCarcass] = useState('HDHMR Board – Action Tesa');
  const [specShutter, setSpecShutter] = useState('Acrylic Finish');
  const [specFinish, setSpecFinish] = useState('High Gloss Acrylic');
  const [specBrand, setSpecBrand] = useState('Action TESA / Merino');
  const [specHardware, setSpecHardware] = useState('Hettich Soft Close');
  const [specThickness, setSpecThickness] = useState('18mm');
  const [accName, setAccName] = useState('');
  const [accQty, setAccQty] = useState('1');
  const [accInclusion, setAccInclusion] = useState('INCLUDED');
  const [itemAccessories, setItemAccessories] = useState([]);
  const [itemRemarks, setItemRemarks] = useState('');

  // Step 3 Form
  const [handlingPercent, setHandlingPercent] = useState('2');
  const [designPercent, setDesignPercent] = useState('2');
  const [discountType, setDiscountType] = useState('PERCENT');
  const [discountValue, setDiscountValue] = useState('0');
  const [gstPercent, setGstPercent] = useState('18');
  const [gstType, setGstType] = useState('CGST_SGST');

  // Step 4 Form
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [quotationNotes, setQuotationNotes] = useState('');

  // Email Modal Form
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Invoice Form & Payment Form for Invoices tab
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    projectName: '',
    description: 'Milestone 1: Civil & Modular Advance',
    amount: 250000,
    gstRate: 18,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    method: 'Bank Transfer (NEFT/RTGS)',
    transactionRef: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'quotations' || activeTab === 'revisions') {
        const params = {};
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const [resList, resSum] = await Promise.all([
          api.get('/quotations', { params }),
          api.get('/quotations/summary').catch(() => null),
        ]);

        const list = resList.data?.quotations || resList.data?.data || [];
        setQuotations(list);
        if (resSum?.data?.summary) {
          setSummary(resSum.data.summary);
        }
      } else if (activeTab === 'invoices') {
        const res = await api.get('/finance/invoices');
        setInvoices(res.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data from backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered quotations by search query
  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const q = searchQuery.toLowerCase();
    return quotations.filter(
      (item) =>
        (item.quotationNumber && item.quotationNumber.toLowerCase().includes(q)) ||
        (item.client?.name && item.client.name.toLowerCase().includes(q)) ||
        (item.projectTitle && item.projectTitle.toLowerCase().includes(q)) ||
        (item.client?.phone && item.client.phone.includes(q))
    );
  }, [quotations, searchQuery]);

  // Live Pricing Calculation for Modal
  const liveCalc = useMemo(() => {
    const sub = items.reduce((acc, it) => acc + (it.amount || (it.quantity || 1) * (it.rate || 0)), 0);
    const handlingFee = Math.round(sub * ((parseFloat(handlingPercent) || 0) / 100));
    const designFee = Math.round(sub * ((parseFloat(designPercent) || 0) / 100));
    const discVal = parseFloat(discountValue) || 0;
    const discountAmt = discountType === 'PERCENT' ? Math.round(sub * (discVal / 100)) : Math.min(sub, discVal);
    const taxable = Math.max(0, sub + handlingFee + designFee - discountAmt);
    const gstPct = parseFloat(gstPercent) || 0;
    const gstAmt = Math.round(taxable * (gstPct / 100));
    const grandTotal = taxable + gstAmt;

    const totalMilestonePct = milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
    const isMilestoneValid = Math.abs(totalMilestonePct - 100) < 0.5;

    return { sub, handlingFee, designFee, discountAmt, taxable, gstAmt, grandTotal, totalMilestonePct, isMilestoneValid };
  }, [items, handlingPercent, designPercent, discountType, discountValue, gstPercent, milestones]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────

  const handleSelectRoom = (r) => {
    if (r === 'Custom' || r === '+ Add More') {
      setShowCustomCategoryInput(true);
      return;
    }
    setSelectedRoom(r);
    setShowCustomCategoryInput(false);
    setShowCustomSubItemInput(false);

    const availableSubItems = subItemMap[r] || DEFAULT_CATEGORY_SUB_ITEMS[r] || [];
    const firstSubItem = availableSubItems.find((item) => item !== '+ Add More');
    if (firstSubItem) {
      setItemName(firstSubItem);
    }
  };

  const handleConfirmCustomRoom = () => {
    const trimmed = customCategoryName.trim();
    if (!trimmed) return;

    if (!roomCategories.includes(trimmed)) {
      const updatedCategories = [...roomCategories];
      const addMoreIdx = updatedCategories.findIndex((c) => c === '+ Add More' || c === 'Custom');
      if (addMoreIdx !== -1) {
        updatedCategories.splice(addMoreIdx, 0, trimmed);
      } else {
        updatedCategories.push(trimmed);
      }
      setRoomCategories(updatedCategories);
    }

    if (!subItemMap[trimmed]) {
      setSubItemMap((prev) => ({
        ...prev,
        [trimmed]: ['Standard Item', '+ Add More'],
      }));
    }

    setSelectedRoom(trimmed);
    setItemName('Standard Item');
    setCustomCategoryName('');
    setShowCustomCategoryInput(false);
  };

  const autoAddSubItemOption = (room, name) => {
    const trimmed = name?.trim();
    if (!trimmed || trimmed === '+ Add More') return;
    const currentSubItems = subItemMap[room] || DEFAULT_CATEGORY_SUB_ITEMS[room] || ['+ Add More'];
    if (!currentSubItems.includes(trimmed)) {
      const updated = [...currentSubItems];
      const addMoreIdx = updated.indexOf('+ Add More');
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setSubItemMap((prev) => ({
        ...prev,
        [room]: updated,
      }));
    }
  };

  const handleSelectSubItem = (subItem) => {
    if (subItem === '+ Add More') {
      setShowCustomSubItemInput(true);
      return;
    }
    setItemName(subItem);
    setShowCustomSubItemInput(false);
  };

  const handleConfirmCustomSubItem = (overrideName) => {
    const trimmed = (overrideName || customSubItemName).trim();
    if (!trimmed) return;

    autoAddSubItemOption(selectedRoom, trimmed);
    setItemName(trimmed);
    setCustomSubItemName('');
    setShowCustomSubItemInput(false);
  };

  const handleSelectUnit = (u) => {
    if (u === '+ Add More') {
      setShowCustomUnitInput(true);
      return;
    }
    setItemUnit(u);
    setShowCustomUnitInput(false);
  };

  const handleConfirmCustomUnit = (overrideName) => {
    const trimmed = (overrideName || customUnitName).trim();
    if (!trimmed) return;

    if (!unitOptions.includes(trimmed)) {
      const updated = [...unitOptions];
      const addMoreIdx = updated.indexOf('+ Add More');
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setUnitOptions(updated);
    }

    setItemUnit(trimmed);
    setCustomUnitName('');
    setShowCustomUnitInput(false);
  };

  const handleSelectMaterial = (m) => {
    if (m === '+ Add More') {
      setShowCustomMaterialInput(true);
      return;
    }
    setSpecCarcass(m);
    setShowCustomMaterialInput(false);
  };

  const handleConfirmCustomMaterial = (overrideName) => {
    const trimmed = (overrideName || customMaterialName).trim();
    if (!trimmed) return;

    if (!materialOptions.includes(trimmed)) {
      const updated = [...materialOptions];
      const addMoreIdx = updated.indexOf('+ Add More');
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setMaterialOptions(updated);
    }

    setSpecCarcass(trimmed);
    setCustomMaterialName('');
    setShowCustomMaterialInput(false);
  };

  const handleSelectHardware = (h) => {
    if (h === '+ Add More') {
      setShowCustomHardwareInput(true);
      return;
    }
    setSpecHardware(h);
    setShowCustomHardwareInput(false);
  };

  const handleConfirmCustomHardware = (overrideName) => {
    const trimmed = (overrideName || customHardwareName).trim();
    if (!trimmed) return;

    if (!hardwareOptions.includes(trimmed)) {
      const updated = [...hardwareOptions];
      const addMoreIdx = updated.indexOf('+ Add More');
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setHardwareOptions(updated);
    }

    setSpecHardware(trimmed);
    setCustomHardwareName('');
    setShowCustomHardwareInput(false);
  };

  const handleSelectAccessory = (acc) => {
    if (acc === '+ Add More') {
      setShowCustomAccessoryInput(true);
      return;
    }
    setAccName(acc);
    setShowCustomAccessoryInput(false);
  };

  const handleConfirmCustomAccessory = (overrideName) => {
    const trimmed = (overrideName || customAccessoryName).trim();
    if (!trimmed) return;

    if (!accessoryOptions.includes(trimmed)) {
      const updated = [...accessoryOptions];
      const addMoreIdx = updated.indexOf('+ Add More');
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setAccessoryOptions(updated);
    }

    setAccName(trimmed);
    setCustomAccessoryName('');
    setShowCustomAccessoryInput(false);
  };

  const handleAddAccessory = () => {
    const trimmed = accName.trim();
    if (!trimmed) return;
    const qty = parseInt(accQty, 10) || 1;
    setItemAccessories([...itemAccessories, { name: trimmed, qty, inclusionType: 'INCLUDED', cost: 0 }]);
    setAccName('');
    setAccQty('1');
  };

  const handleAddItem = () => {
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      alert('Please enter an item name.');
      return;
    }

    // Automatically make sure this item name is an option pill in the selectedRoom category!
    autoAddSubItemOption(selectedRoom, trimmedName);

    const rateNum = parseFloat(itemRate) || 0;
    const sizeNum = parseFloat(itemSize) || 0;
    const qtyNum = sizeNum > 0 ? sizeNum : 1;
    const itemAmt = Math.round(qtyNum * rateNum);

    const newItem = {
      itemNumber: items.length + 1,
      room: selectedRoom,
      name: trimmedName,
      description: itemDesc.trim(),
      unit: itemUnit || 'Sq Ft',
      measurements: { length: 0, width: 0, height: 0, calculatedArea: sizeNum },
      quantity: qtyNum,
      rate: rateNum,
      amount: itemAmt,
      specifications: { carcass: specCarcass, shutter: specShutter, finish: specFinish, brand: specBrand, hardware: specHardware, thickness: specThickness },
      accessories: itemAccessories,
      remarks: itemRemarks.trim(),
      scope: 'COMPANY_SCOPE',
      costVariationNote: 'Cost may vary as per site measurements.',
    };

    setItems([...items, newItem]);
    setItemName('');
    setItemDesc('');
    setItemSize('1');
    setItemRate('');
    setItemAccessories([]);
    setItemRemarks('');
  };

  const handleOpenCreateModal = (existing = null) => {
    if (existing) {
      setEditingQuotationId(existing._id);
      setClientName(existing.client?.name || '');
      setClientCompany(existing.client?.company || '');
      setClientPhone(existing.client?.phone || '');
      setClientEmail(existing.client?.email || '');
      setClientAddress(existing.client?.address || '');
      setClientGstin(existing.client?.gstin || '');
      setProjectTitle(existing.projectTitle || '');
      setProjectType(existing.projectType || 'Residential Interior');
      setSiteLocation(existing.siteLocation || '');
      const existingItems = existing.items || [];
      setItems(existingItems);

      // Merge room categories & sub-items from existing quotation items
      const updatedCategories = [...roomCategories];
      const updatedSubMap = { ...subItemMap };

      existingItems.forEach((it) => {
        if (it.room && !updatedCategories.includes(it.room)) {
          const addMoreIdx = updatedCategories.findIndex((c) => c === '+ Add More' || c === 'Custom');
          if (addMoreIdx !== -1) {
            updatedCategories.splice(addMoreIdx, 0, it.room);
          } else {
            updatedCategories.push(it.room);
          }
        }
        if (it.room && it.name) {
          const currentList = updatedSubMap[it.room] || ['+ Add More'];
          if (!currentList.includes(it.name)) {
            const newList = [...currentList];
            const addMoreIdx = newList.indexOf('+ Add More');
            if (addMoreIdx !== -1) {
              newList.splice(addMoreIdx, 0, it.name);
            } else {
              newList.push(it.name);
            }
            updatedSubMap[it.room] = newList;
          }
        }
      });
      setRoomCategories(updatedCategories);
      setSubItemMap(updatedSubMap);

      const firstRoom = existingItems[0]?.room || 'Modular Kitchen';
      setSelectedRoom(firstRoom);
      setItemName(existingItems[0]?.name || (updatedSubMap[firstRoom]?.[0] !== '+ Add More' ? updatedSubMap[firstRoom]?.[0] : ''));

      setHandlingPercent(String(existing.pricing?.handlingFeePercent || 2));
      setDesignPercent(String(existing.pricing?.designFeePercent || 2));
      setDiscountType(existing.pricing?.discountType || 'PERCENT');
      setDiscountValue(String(existing.pricing?.discountValue || 0));
      setGstPercent(String(existing.pricing?.gstPercent || 18));
      setGstType(existing.pricing?.gstType || 'CGST_SGST');
      setMilestones(existing.paymentMilestones && existing.paymentMilestones.length > 0 ? existing.paymentMilestones : DEFAULT_MILESTONES);
      setQuotationNotes(existing.notes || '');
    } else {
      setEditingQuotationId(null);
      setClientName('');
      setClientCompany('');
      setClientPhone('');
      setClientEmail('');
      setClientAddress('');
      setClientGstin('');
      setProjectTitle('');
      setProjectType('Residential Interior');
      setSiteLocation('');
      setItems([]);
      setSelectedRoom('Modular Kitchen');
      setItemName(DEFAULT_CATEGORY_SUB_ITEMS['Modular Kitchen']?.[0] || '');
      setHandlingPercent('2');
      setDesignPercent('2');
      setDiscountType('PERCENT');
      setDiscountValue('0');
      setGstPercent('18');
      setGstType('CGST_SGST');
      setMilestones(DEFAULT_MILESTONES);
      setQuotationNotes('');
    }
    setShowCustomCategoryInput(false);
    setShowCustomSubItemInput(false);
    setFormStep(1);
    setShowCreateModal(true);
  };

  const handleSaveQuotation = async (e) => {
    if (e) e.preventDefault();
    if (!clientName.trim()) {
      alert('Client Name is required.');
      setFormStep(1);
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item to the quotation scope.');
      setFormStep(2);
      return;
    }
    if (!liveCalc.isMilestoneValid) {
      alert(`Milestone percentages must equal 100%. Currently: ${liveCalc.totalMilestonePct}%`);
      setFormStep(4);
      return;
    }

    setIsActionLoading(true);
    try {
      const payload = {
        client: {
          name: clientName.trim(),
          company: clientCompany.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          address: clientAddress.trim(),
          gstin: clientGstin.trim(),
        },
        projectTitle: projectTitle.trim() || `${clientName.trim()} Interior Proposal`,
        projectType,
        siteLocation: siteLocation.trim() || clientAddress.trim(),
        items,
        pricing: {
          handlingFeePercent: parseFloat(handlingPercent) || 0,
          designFeePercent: parseFloat(designPercent) || 0,
          discountType,
          discountValue: parseFloat(discountValue) || 0,
          gstPercent: parseFloat(gstPercent) || 18,
          gstType,
        },
        paymentMilestones: milestones,
        notes: quotationNotes.trim(),
      };

      if (editingQuotationId) {
        await api.put(`/quotations/${editingQuotationId}`, payload);
        setSuccess('Quotation updated successfully!');
      } else {
        await api.post('/quotations', payload);
        setSuccess('Quotation generated successfully!');
      }

      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save quotation.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteQuotation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await api.delete(`/quotations/${id}`);
      setSuccess('Quotation deleted successfully.');
      fetchData();
    } catch (err) {
      setError('Failed to delete quotation.');
    }
  };

  const handleOpenEmailModal = (q) => {
    setSelectedQuotation(q);
    setEmailRecipient(q.client?.email || '');
    setEmailCc('');
    setEmailSubject(`[Altera Interior] Quotation Proposal ${q.quotationNumber} - ${q.projectTitle}`);
    setEmailMessage(
      `Dear ${q.client?.name || 'Client'},\n\nPlease find attached the official interior quotation proposal for ${q.projectTitle || 'your project'}.\n\nEstimated Grand Total: ${formatINR(q.pricing?.grandTotal || q.grandTotal)}.\n\nLooking forward to working with you!\n\nWarm regards,\nAltera Interior Team`
    );
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!selectedQuotation || !emailRecipient.trim()) {
      alert('Recipient email address is required.');
      return;
    }
    setIsActionLoading(true);
    try {
      const htmlContent = buildQuotationHtml(selectedQuotation);
      const base64Pdf = utf8ToBase64(htmlContent);

      await api.post(`/quotations/${selectedQuotation._id}/send`, {
        recipientEmail: emailRecipient.trim(),
        cc: emailCc.trim() || undefined,
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
        pdfBase64: base64Pdf,
      });

      setSuccess(`Proposal email successfully dispatched to ${emailRecipient}!`);
      setShowEmailModal(false);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send email. Check recipient email or server connection.';
      setError(`Server Error (400): ${msg}`);
      alert(`Email Failed: ${msg}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConvertToProject = async (q) => {
    if (!window.confirm(`Convert Quotation ${q.quotationNumber} (${formatINR(q.pricing?.grandTotal || q.grandTotal)}) into an active project?`)) return;
    setIsActionLoading(true);
    try {
      const res = await api.post(`/quotations/${q._id}/convert-to-project`);
      setSuccess(`Successfully converted to Project ${res.data.project?.projectId || 'CRM'}!`);
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not convert to project.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const amt = Number(invoiceForm.amount) || 0;
      const gstAmt = (amt * invoiceForm.gstRate) / 100;
      const total = amt + gstAmt;

      const payload = {
        clientName: invoiceForm.clientName,
        projectName: invoiceForm.projectName,
        items: [{ description: invoiceForm.description, quantity: 1, rate: amt, amount: amt }],
        subtotal: amt,
        gstRate: invoiceForm.gstRate,
        gstAmount: gstAmt,
        totalAmount: total,
        dueDate: invoiceForm.dueDate,
        paymentStatus: 'Issued',
      };

      await api.post('/finance/invoices', payload);
      setSuccess('Invoice created successfully!');
      setShowInvoiceModal(false);
      fetchData();
    } catch (err) {
      setError('Failed to create invoice.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await api.post(`/finance/invoices/${selectedInvoice._id}/payments`, paymentForm);
      setSuccess(`Payment recorded for ${selectedInvoice.invoiceNumber}!`);
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchData();
    } catch (err) {
      setError('Failed to record payment.');
    }
  };

  return (
    <AdminLayout title="Quotations & Invoicing Suite">
      {/* ── TOP TABS ──────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        <button
          style={activeTab === 'quotations' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('quotations')}
        >
          📋 Quotations ({quotations.length})
        </button>
        <button
          style={activeTab === 'revisions' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('revisions')}
        >
          🔄 Revision History
        </button>
        <button
          style={activeTab === 'invoices' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('invoices')}
        >
          🧾 Invoices &amp; Payments ({invoices.length})
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── TAB 1: QUOTATIONS ─────────────────────────────────────── */}
      {activeTab === 'quotations' && (
        <div>
          {/* KPI Summary Header */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="card" style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Total Pipeline Value</div>
                <div style={styles.kpiVal}>{formatINR(summary.totalPipelineValue)}</div>
                <div style={styles.kpiSub}>{summary.totalQuotations} Total Proposals</div>
              </div>
              <div className="card" style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Approved / Converted</div>
                <div style={styles.kpiVal}>{formatINR(summary.approvedValue)}</div>
                <div style={styles.kpiSub}>{summary.approvedCount + (summary.convertedCount || 0)} Projects</div>
              </div>
              <div className="card" style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Pending Review</div>
                <div style={styles.kpiVal}>{summary.sentCount || 0}</div>
                <div style={styles.kpiSub}>In Discussion</div>
              </div>
              <div className="card" style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Work In Progress</div>
                <div style={styles.kpiVal}>{summary.draftCount || 0}</div>
                <div style={styles.kpiSub}>Draft Estimates</div>
              </div>
            </div>
          )}

          {/* Action Header & Search Toolbar */}
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search quotation #, client, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Under Discussion">Under Discussion</option>
                  <option value="Approved">Approved</option>
                  <option value="Converted to Project">Converted to Project</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <button className="btn btn-primary" onClick={() => handleOpenCreateModal()} style={{ fontSize: 13, fontWeight: 700 }}>
                ➕ Create Quotation
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filteredQuotations.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No quotations found. Click <strong>+ Create Quotation</strong> to generate an interior proposal.
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Quotation #</th>
                    <th>Client &amp; Contact</th>
                    <th>Project &amp; Location</th>
                    <th>Items</th>
                    <th>Grand Total (Inc GST)</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((q) => {
                    const grandTotal = q.pricing?.grandTotal || q.grandTotal || 0;
                    return (
                      <tr key={q._id} style={styles.trRow}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {q.quotationNumber}
                          {q.revision > 0 && <span style={styles.revBadge}>v{q.revision}</span>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{q.client?.name || 'Homeowner'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>📞 {q.client?.phone || '—'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{q.projectTitle || 'Interior Works'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>📍 {q.siteLocation || q.client?.address || '—'}</div>
                        </td>
                        <td style={{ color: '#334155' }}>{q.items?.length || 0} items</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(grandTotal)}</td>
                        <td>
                          <span style={styles.badgeStatus}>
                            {q.status || 'Draft'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#475569' }}>{formatDate(q.quotationDate || q.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              title="View Details"
                              className="btn btn-secondary"
                              style={styles.iconBtn}
                              onClick={() => {
                                setSelectedQuotation(q);
                                setShowDetailModal(true);
                              }}
                            >
                              👁️
                            </button>
                            <button
                              title="Print / Download PDF"
                              className="btn btn-secondary"
                              style={styles.iconBtn}
                              onClick={() => printQuotation(q)}
                            >
                              📄
                            </button>
                            <button
                              title="Email to Client"
                              className="btn btn-secondary"
                              style={styles.iconBtn}
                              onClick={() => handleOpenEmailModal(q)}
                            >
                              ✉️
                            </button>
                            <button
                              title="Edit Quotation"
                              className="btn btn-secondary"
                              style={styles.iconBtn}
                              onClick={() => handleOpenCreateModal(q)}
                            >
                              ✏️
                            </button>
                            <button
                              title="Delete Quotation"
                              className="btn btn-secondary"
                              style={{ ...styles.iconBtn, color: '#dc2626' }}
                              onClick={() => handleDeleteQuotation(q._id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: REVISION HISTORY ──────────────────────────── */}
      {activeTab === 'revisions' && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Quotation Revision Audit Trail
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Audit version history and scope modifications across all customer proposals.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {quotations.map((q) => (
              <div key={q._id} className="card" style={{ padding: 18, border: '1px solid #cbd5e1', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{q.quotationNumber}</span>
                  <span style={styles.revBadge}>Rev {q.revision || 0}</span>
                </div>
                <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}><strong>Client:</strong> {q.client?.name}</div>
                <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700, marginTop: 4 }}>
                  Total: {formatINR(q.pricing?.grandTotal || q.grandTotal)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Generated: {formatDate(q.quotationDate || q.createdAt)}
                </div>
                <div style={{ marginTop: 10, background: '#f8fafc', padding: 8, borderRadius: 6, fontSize: 12, color: '#475569', border: '1px solid #e2e8f0' }}>
                  Scope: {Array.from(new Set((q.items || []).map((i) => i.room))).join(', ') || 'General Interior'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: INVOICES & PAYMENTS ───────────────────────── */}
      {activeTab === 'invoices' && (
        <div>
          <div style={styles.actionHeader}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Client Invoices &amp; Receivables</h3>
            <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
              ➕ New Invoice
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : invoices.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No invoices generated yet.
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Invoice #</th>
                    <th>Client &amp; Project</th>
                    <th>Due Date</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} style={styles.trRow}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{inv.invoiceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.clientName}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{inv.projectName || 'Interior Works'}</div>
                      </td>
                      <td style={{ color: '#334155' }}>{formatDate(inv.dueDate)}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(inv.totalAmount)}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(inv.paidAmount)}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(inv.balanceAmount)}</td>
                      <td>
                        <span style={styles.badgeStatus}>{inv.paymentStatus}</span>
                      </td>
                      <td>
                        {inv.paymentStatus !== 'Paid' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({ ...paymentForm, amount: inv.balanceAmount });
                              setShowPaymentModal(true);
                            }}
                          >
                            + Record Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT QUOTATION (WIZARD) ──────────── */}
      {showCreateModal && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 850 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {editingQuotationId ? 'Revise Interior Quotation' : 'Create Interior Quotation Proposal'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            {/* Step Wizard Tabs */}
            <div style={styles.wizardTabs}>
              {[
                { num: 1, label: '1. Client & Project' },
                { num: 2, label: '2. Scope & Room Items' },
                { num: 3, label: '3. Pricing & Taxes' },
                { num: 4, label: '4. Milestones & Save' },
              ].map((s) => (
                <button
                  key={s.num}
                  style={formStep === s.num ? styles.wizardTabActive : styles.wizardTab}
                  onClick={() => setFormStep(s.num)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveQuotation} style={{ marginTop: 16 }}>
              {/* STEP 1: CLIENT & PROJECT */}
              {formStep === 1 && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Client Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={styles.label}>Client Name *</label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        style={styles.formInput}
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Company Name (Optional)</label>
                      <input
                        type="text"
                        value={clientCompany}
                        onChange={(e) => setClientCompany(e.target.value)}
                        style={styles.formInput}
                        placeholder="e.g. Sharma Properties"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Phone Number</label>
                      <input
                        type="text"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        style={styles.formInput}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={styles.label}>Email Address</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        style={styles.formInput}
                        placeholder="client@example.com"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Site / Project Address</label>
                      <input
                        type="text"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        style={styles.formInput}
                        placeholder="e.g. Flat 402, Lotus Heights"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Client GSTIN (Optional)</label>
                      <input
                        type="text"
                        value={clientGstin}
                        onChange={(e) => setClientGstin(e.target.value)}
                        style={styles.formInput}
                        placeholder="07AAAAA0000A1Z5"
                      />
                    </div>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10, marginTop: 16 }}>Project Parameters</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={styles.label}>Project Title</label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        style={styles.formInput}
                        placeholder="3BHK Luxury Interior Execution"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Project Type</label>
                      <input
                        type="text"
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value)}
                        style={styles.formInput}
                        placeholder="Residential / Commercial"
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Site Location / City</label>
                      <input
                        type="text"
                        value={siteLocation}
                        onChange={(e) => setSiteLocation(e.target.value)}
                        style={styles.formInput}
                        placeholder="Gurugram / Delhi / Noida"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                    <button type="button" className="btn btn-primary" onClick={() => setFormStep(2)}>
                      Next: Add Scope Items →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: ROOMS & SCOPE ITEMS */}
              {formStep === 2 && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={styles.label}>1. Select Room / Category:</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {roomCategories.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleSelectRoom(r)}
                          style={selectedRoom === r ? styles.roomBtnActive : styles.roomBtn}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {showCustomCategoryInput && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 400 }}>
                        <input
                          type="text"
                          placeholder="Enter Custom Category Name"
                          value={customCategoryName}
                          onChange={(e) => setCustomCategoryName(e.target.value)}
                          style={styles.formInput}
                          autoFocus
                        />
                        <button type="button" className="btn btn-primary" onClick={handleConfirmCustomRoom} style={{ padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          Add Category
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SUB-ITEM / ITEM NAME SELECTION */}
                  <div style={{ marginBottom: 14, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                    <label style={{ ...styles.label, color: '#0f172a', fontWeight: 700 }}>
                      2. Select Item Name for <span style={{ color: '#2563eb' }}>{selectedRoom}</span>:
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {(subItemMap[selectedRoom] || DEFAULT_CATEGORY_SUB_ITEMS[selectedRoom] || ['+ Add More']).map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleSelectSubItem(sub)}
                          style={itemName === sub ? styles.subItemBtnActive : sub === '+ Add More' ? styles.subItemAddMoreBtn : styles.subItemBtn}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>

                    {showCustomSubItemInput && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, maxWidth: 500 }}>
                        <input
                          type="text"
                          placeholder={`Type custom item name for ${selectedRoom}...`}
                          value={customSubItemName}
                          onChange={(e) => {
                            setCustomSubItemName(e.target.value);
                            if (e.target.value.trim()) {
                              setItemName(e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmCustomSubItem();
                            }
                          }}
                          style={styles.formInput}
                          autoFocus
                        />
                        <button type="button" className="btn btn-primary" onClick={() => handleConfirmCustomSubItem()} style={{ padding: '4px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          + Add Option
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Composer Card */}
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                      Configure Details for <span style={{ color: '#2563eb' }}>{itemName || selectedRoom}</span>
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                      <div>
                        <label style={styles.label}>Item Name *</label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              autoAddSubItemOption(selectedRoom, e.target.value.trim());
                            }
                          }}
                          style={styles.formInput}
                          placeholder="Type custom item name or select an option above..."
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Description</label>
                        <input
                          type="text"
                          value={itemDesc}
                          onChange={(e) => setItemDesc(e.target.value)}
                          style={styles.formInput}
                          placeholder="e.g. Marine ply carcass with acrylic shutter"
                        />
                      </div>
                    </div>

                    {/* Unit Pills Selection */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={styles.label}>Select Unit / Measurement Type:</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        {unitOptions.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleSelectUnit(u)}
                            style={itemUnit === u ? styles.subItemBtnActive : u === '+ Add More' ? styles.subItemAddMoreBtn : styles.subItemBtn}
                          >
                            {u}
                          </button>
                        ))}
                      </div>

                      {showCustomUnitInput && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 350 }}>
                          <input
                            type="text"
                            placeholder="Enter custom unit (e.g. Rft, Sets, Meter)..."
                            value={customUnitName}
                            onChange={(e) => {
                              setCustomUnitName(e.target.value);
                              if (e.target.value.trim()) {
                                setItemUnit(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmCustomUnit();
                              }
                            }}
                            style={styles.formInput}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmCustomUnit()}
                            style={{ padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                          >
                            + Add Unit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Merged Size & Rate Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                      <div>
                        <label style={styles.label}>Size ({itemUnit || 'Sq Ft'}) *</label>
                        <input
                          type="number"
                          value={itemSize}
                          onChange={(e) => setItemSize(e.target.value)}
                          style={styles.formInput}
                          placeholder="e.g. 120"
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Rate (₹) *</label>
                        <input
                          type="number"
                          value={itemRate}
                          onChange={(e) => setItemRate(e.target.value)}
                          style={styles.formInput}
                          placeholder="e.g. 1550"
                        />
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#0f172a', paddingTop: 16 }}>
                        Amt: {formatINR((parseFloat(itemSize) || 0) * (parseFloat(itemRate) || 0))}
                      </div>
                    </div>

                    {/* Material Specifications */}
                    <div style={{ marginBottom: 12, background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, fontWeight: 700, color: '#0f172a' }}>
                        Select Core Material:
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {materialOptions.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSelectMaterial(m)}
                            style={specCarcass === m ? styles.subItemBtnActive : m === '+ Add More' ? styles.subItemAddMoreBtn : styles.subItemBtn}
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      {showCustomMaterialInput && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 450 }}>
                          <input
                            type="text"
                            placeholder="Type custom material (e.g. Commercial Ply)..."
                            value={customMaterialName}
                            onChange={(e) => {
                              setCustomMaterialName(e.target.value);
                              if (e.target.value.trim()) {
                                setSpecCarcass(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmCustomMaterial();
                              }
                            }}
                            style={styles.formInput}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmCustomMaterial()}
                            style={{ padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                          >
                            + Add Material
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Hardware Specifications */}
                    <div style={{ marginBottom: 12, background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, fontWeight: 700, color: '#0f172a' }}>
                        Select Hardware Option:
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {hardwareOptions.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => handleSelectHardware(h)}
                            style={specHardware === h ? styles.subItemBtnActive : h === '+ Add More' ? styles.subItemAddMoreBtn : styles.subItemBtn}
                          >
                            {h}
                          </button>
                        ))}
                      </div>

                      {showCustomHardwareInput && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 450 }}>
                          <input
                            type="text"
                            placeholder="Type custom hardware (e.g. Ebco Hydraulic)..."
                            value={customHardwareName}
                            onChange={(e) => {
                              setCustomHardwareName(e.target.value);
                              if (e.target.value.trim()) {
                                setSpecHardware(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmCustomHardware();
                              }
                            }}
                            style={styles.formInput}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmCustomHardware()}
                            style={{ padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                          >
                            + Add Hardware
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Accessories Specifications */}
                    <div style={{ marginBottom: 12, background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                      <label style={{ ...styles.label, fontWeight: 700, color: '#0f172a' }}>
                        Add Accessories (Wicker basket, BPO, Innotech, etc.):
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {accessoryOptions.map((acc) => (
                          <button
                            key={acc}
                            type="button"
                            onClick={() => handleSelectAccessory(acc)}
                            style={accName === acc ? styles.subItemBtnActive : acc === '+ Add More' ? styles.subItemAddMoreBtn : styles.subItemBtn}
                          >
                            {acc}
                          </button>
                        ))}
                      </div>

                      {showCustomAccessoryInput && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 450 }}>
                          <input
                            type="text"
                            placeholder="Type custom accessory name..."
                            value={customAccessoryName}
                            onChange={(e) => {
                              setCustomAccessoryName(e.target.value);
                              if (e.target.value.trim()) {
                                setAccName(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmCustomAccessory();
                              }
                            }}
                            style={styles.formInput}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmCustomAccessory()}
                            style={{ padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                          >
                            + Add Option
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Accessory name (e.g. Wicker basket)"
                          value={accName}
                          onChange={(e) => setAccName(e.target.value)}
                          style={{ ...styles.formInput, flex: 2 }}
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={accQty}
                          onChange={(e) => setAccQty(e.target.value)}
                          style={{ ...styles.formInput, width: 70 }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleAddAccessory}
                          style={{ padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                        >
                          + Add Accessory
                        </button>
                      </div>

                      {itemAccessories.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {itemAccessories.map((a, i) => (
                            <span
                              key={i}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1e40af',
                                borderRadius: 14,
                                padding: '2px 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {a.name} (x{a.qty})
                              <button
                                type="button"
                                style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}
                                onClick={() => setItemAccessories(itemAccessories.filter((_, idx) => idx !== i))}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Additional Specifications */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: '#475569' }}>Selected Material</label>
                        <input type="text" value={specCarcass} onChange={(e) => setSpecCarcass(e.target.value)} style={{ ...styles.formInput, padding: '4px 6px', fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#475569' }}>Selected Hardware</label>
                        <input type="text" value={specHardware} onChange={(e) => setSpecHardware(e.target.value)} style={{ ...styles.formInput, padding: '4px 6px', fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#475569' }}>Shutter</label>
                        <input type="text" value={specShutter} onChange={(e) => setSpecShutter(e.target.value)} style={{ ...styles.formInput, padding: '4px 6px', fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#475569' }}>Finish</label>
                        <input type="text" value={specFinish} onChange={(e) => setSpecFinish(e.target.value)} style={{ ...styles.formInput, padding: '4px 6px', fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#475569' }}>Brand</label>
                        <input type="text" value={specBrand} onChange={(e) => setSpecBrand(e.target.value)} style={{ ...styles.formInput, padding: '4px 6px', fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#475569' }}>Thickness</label>
                        <input type="text" value={specThickness} onChange={(e) => setSpecThickness(e.target.value)} style={{ ...styles.formInput, padding: '4px 6px', fontSize: 11 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="button" className="btn btn-secondary" onClick={handleAddItem} style={{ fontSize: 12, padding: '5px 12px' }}>
                        + Add Item to Scope
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <h4 style={{ margin: '10px 0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Scope Items ({items.length})</h4>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 16 }}>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 12 }}>No items added yet. Compose one above.</div>
                    ) : (
                      items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{it.name}</span>{' '}
                            <span style={{ fontSize: 11, color: '#64748b' }}>[{it.room}]</span>
                            <div style={{ fontSize: 11, color: '#475569' }}>{it.quantity} {it.unit} × {formatINR(it.rate)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{formatINR(it.amount)}</span>
                            <button
                              type="button"
                              style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setFormStep(1)}>← Back</button>
                    <button type="button" className="btn btn-primary" onClick={() => setFormStep(3)}>Next: Charges &amp; GST →</button>
                  </div>
                </div>
              )}

              {/* STEP 3: PRICING & GST */}
              {formStep === 3 && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Additional Fees &amp; Discounts</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={styles.label}>Handling Fees (%)</label>
                      <input type="number" value={handlingPercent} onChange={(e) => setHandlingPercent(e.target.value)} style={styles.formInput} />
                    </div>
                    <div>
                      <label style={styles.label}>Design Fees (%)</label>
                      <input type="number" value={designPercent} onChange={(e) => setDesignPercent(e.target.value)} style={styles.formInput} />
                    </div>
                    <div>
                      <label style={styles.label}>Discount Type</label>
                      <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={styles.formInput}>
                        <option value="PERCENT">% Percentage</option>
                        <option value="FIXED">₹ Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Discount Value</label>
                      <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} style={styles.formInput} />
                    </div>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                    GST Configuration &amp; Tax Options
                  </h4>

                  <div style={{ marginBottom: 16, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                    <label style={{ ...styles.label, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                      Apply GST Tax on Proposal?
                    </label>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setGstPercent('18');
                        }}
                        style={parseFloat(gstPercent) > 0 ? styles.subItemBtnActive : styles.subItemBtn}
                      >
                        ✓ Apply GST (18%)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGstPercent('0');
                        }}
                        style={parseFloat(gstPercent) === 0 ? styles.subItemBtnActive : styles.subItemBtn}
                      >
                        ✕ No GST / Exempt (0%)
                      </button>

                      {[5, 12, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setGstPercent(String(rate))}
                          style={parseFloat(gstPercent) === rate ? styles.subItemBtnActive : styles.subItemBtn}
                        >
                          GST {rate}%
                        </button>
                      ))}
                    </div>

                    {parseFloat(gstPercent) > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                        <div>
                          <label style={styles.label}>GST Rate (%)</label>
                          <input
                            type="number"
                            value={gstPercent}
                            onChange={(e) => setGstPercent(e.target.value)}
                            style={styles.formInput}
                            placeholder="18"
                          />
                        </div>
                        <div>
                          <label style={styles.label}>Tax Type Structure</label>
                          <select value={gstType} onChange={(e) => setGstType(e.target.value)} style={styles.formInput}>
                            <option value="CGST_SGST">CGST + SGST (Intrastate)</option>
                            <option value="IGST">IGST (Interstate)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '8px 12px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                        ✓ GST is set to 0% (Tax-Exempt / Non-GST Proposal). Total payable equals taxable total.
                      </div>
                    )}
                  </div>

                  {/* Live Computed Card */}
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Live Financial Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                      <div>Subtotal: <strong>{formatINR(liveCalc.sub)}</strong></div>
                      <div>Handling ({handlingPercent}%): <strong>{formatINR(liveCalc.handlingFee)}</strong></div>
                      <div>Design ({designPercent}%): <strong>{formatINR(liveCalc.designFee)}</strong></div>
                      <div>Discount: <strong style={{ color: '#059669' }}>-{formatINR(liveCalc.discountAmt)}</strong></div>
                      <div>Taxable Total: <strong>{formatINR(liveCalc.taxable)}</strong></div>
                      <div>GST ({gstPercent}%): <strong>{formatINR(liveCalc.gstAmt)}</strong></div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 10, borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
                      Estimated Grand Total: {formatINR(liveCalc.grandTotal)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setFormStep(2)}>← Back</button>
                    <button type="button" className="btn btn-primary" onClick={() => setFormStep(4)}>Next: Payment Schedule →</button>
                  </div>
                </div>
              )}

              {/* STEP 4: MILESTONES & SAVE */}
              {formStep === 4 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Payment Milestones Schedule</h4>
                    <span style={{ fontSize: 12, fontWeight: 700, color: liveCalc.isMilestoneValid ? '#059669' : '#dc2626' }}>
                      Total Share: {liveCalc.totalMilestonePct}% {liveCalc.isMilestoneValid ? '✓ Valid (100%)' : '⚠️ Must equal 100%'}
                    </span>
                  </div>

                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 16 }}>
                    {milestones.map((m, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 8, marginBottom: 8 }}>
                        <input
                          type="text"
                          value={m.milestoneName}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].milestoneName = e.target.value;
                            setMilestones(updated);
                          }}
                          style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                        />
                        <input
                          type="number"
                          value={m.percentage}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].percentage = Number(e.target.value) || 0;
                            setMilestones(updated);
                          }}
                          style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12, textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          value={m.stage || ''}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].stage = e.target.value;
                            setMilestones(updated);
                          }}
                          style={{ ...styles.formInput, padding: '4px 6px', fontSize: 12 }}
                          placeholder="Stage description"
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={styles.label}>Internal Notes / Terms</label>
                    <textarea
                      rows={3}
                      value={quotationNotes}
                      onChange={(e) => setQuotationNotes(e.target.value)}
                      style={{ ...styles.formInput, resize: 'vertical' }}
                      placeholder="Special customer remarks or scope details..."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setFormStep(3)}>← Back</button>
                    <button type="submit" className="btn btn-primary" disabled={isActionLoading}>
                      {isActionLoading ? 'Saving...' : '✓ Save & Generate Quotation'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW QUOTATION DETAILS ────────────────────── */}
      {showDetailModal && selectedQuotation && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 750 }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  Quotation {selectedQuotation.quotationNumber}
                </h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>{selectedQuotation.projectTitle}</div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={{ margin: '16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Client Information</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginTop: 4 }}>{selectedQuotation.client?.name}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>📞 {selectedQuotation.client?.phone || '—'} | ✉️ {selectedQuotation.client?.email || '—'}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>📍 {selectedQuotation.siteLocation || selectedQuotation.client?.address || '—'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Proposal Financials</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {formatINR(selectedQuotation.pricing?.grandTotal || selectedQuotation.grandTotal)}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Subtotal: {formatINR(selectedQuotation.pricing?.subtotal || selectedQuotation.subtotal)}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Status: <strong>{selectedQuotation.status}</strong></div>
                </div>
              </div>

              {/* Items Breakdown */}
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Scope Items ({selectedQuotation.items?.length || 0})</h4>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 16 }}>
                {(selectedQuotation.items || []).map((it, idx) => (
                  <div key={idx} style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{it.name} <span style={{ fontSize: 11, color: '#64748b' }}>[{it.room}]</span></span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{formatINR(it.amount)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {it.quantity} {it.unit} @ {formatINR(it.rate)}
                      {it.measurements?.calculatedArea ? ` (Area: ${it.measurements.calculatedArea} ${it.unit})` : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => printQuotation(selectedQuotation)}>
                  📄 Print / PDF
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowDetailModal(false); handleOpenEmailModal(selectedQuotation); }}>
                  ✉️ Email Client
                </button>
                {selectedQuotation.status !== 'Converted to Project' && (
                  <button className="btn btn-primary" onClick={() => handleConvertToProject(selectedQuotation)} disabled={isActionLoading}>
                    🚀 Convert to Project
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EMAIL DISPATCH ────────────────────────────── */}
      {showEmailModal && selectedQuotation && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Email Quotation PDF</h3>
              <button onClick={() => setShowEmailModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>CC Email (Optional)</label>
                <input
                  type="email"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Message</label>
                <textarea
                  rows={4}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  style={{ ...styles.formInput, resize: 'vertical' }}
                />
              </div>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: 12, color: '#475569', border: '1px solid #e2e8f0' }}>
                📎 Attached: <strong>Quotation_{selectedQuotation.quotationNumber}.pdf</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isActionLoading}>
                  {isActionLoading ? 'Dispatching...' : 'Send Proposal Email ✉️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE INVOICE ─────────────────────────────── */}
      {showInvoiceModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Create New Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={invoiceForm.clientName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Project Name / Site</label>
                <input
                  type="text"
                  value={invoiceForm.projectName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, projectName: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Milestone / Billing Item</label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.label}>Amount Before GST (₹)</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD PAYMENT ─────────────────────────────── */}
      {showPaymentModal && selectedInvoice && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Record Payment for {selectedInvoice.invoiceNumber}</h3>
              <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#0f172a' }}>Client: <strong>{selectedInvoice.clientName}</strong></div>
                <div style={{ color: '#0f172a' }}>Total Invoice: <strong>{formatINR(selectedInvoice.totalAmount)}</strong></div>
                <div style={{ color: '#0f172a' }}>Outstanding: <strong>{formatINR(selectedInvoice.balanceAmount)}</strong></div>
              </div>

              <div>
                <label style={styles.label}>Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const styles = {
  tabBar: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid #cbd5e1',
    paddingBottom: 12,
    marginBottom: 20,
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '8px 16px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    padding: '8px 16px',
    background: '#0f172a',
    border: '1px solid #0f172a',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  kpiCard: {
    padding: 14,
    border: '1px solid #cbd5e1',
    borderRadius: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0f172a',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    minWidth: 220,
    color: '#0f172a',
  },
  selectInput: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    color: '#0f172a',
    background: '#ffffff',
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid #cbd5e1',
    background: '#f8fafc',
    fontSize: 12,
    color: '#475569',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
  },
  revBadge: {
    background: '#f1f5f9',
    color: '#0f172a',
    padding: '2px 6px',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 6,
    border: '1px solid #cbd5e1',
  },
  badgeStatus: {
    background: '#f1f5f9',
    color: '#0f172a',
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    border: '1px solid #cbd5e1',
  },
  iconBtn: {
    padding: '4px 8px',
    fontSize: 12,
  },
  wizardTabs: {
    display: 'flex',
    gap: 6,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 10,
    marginBottom: 14,
    overflowX: 'auto',
  },
  wizardTab: {
    padding: '6px 12px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  wizardTabActive: {
    padding: '6px 12px',
    background: '#0f172a',
    border: '1px solid #0f172a',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  roomBtn: {
    padding: '4px 10px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
  },
  roomBtnActive: {
    padding: '4px 10px',
    background: '#0f172a',
    border: '1px solid #0f172a',
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    cursor: 'pointer',
  },
  subItemBtn: {
    padding: '5px 12px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  subItemBtnActive: {
    padding: '5px 12px',
    background: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
  },
  subItemAddMoreBtn: {
    padding: '5px 12px',
    background: '#eff6ff',
    border: '1px dashed #3b82f6',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 16,
  },
  modalCard: {
    background: '#ffffff',
    borderRadius: 12,
    maxWidth: 580,
    width: '100%',
    padding: 24,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #cbd5e1',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #cbd5e1',
    paddingBottom: 12,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748b',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    color: '#0f172a',
  },
};

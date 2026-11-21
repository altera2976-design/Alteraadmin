import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api, { SOCKET_URL } from "../services/api";
import {
  buildQuotationHtml,
  formatDate,
  formatINR,
  printQuotation,
  utf8ToBase64,
} from "../services/quotationWebPdf";
import LoadingSpinner from "./LoadingSpinner";
import { PREDEFINED_ACCESSORIES } from "../constants/predefinedAccessories";

export const resolveAccessoryImageSrc = (img) => {
  if (!img) return "";
  if (img.startsWith("data:") || img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/hardware-accessories/")) return img;
  if (img.startsWith("/")) {
    const base = (api?.defaults?.baseURL || "").replace(/\/api\/?$/, "");
    return base ? `${base}${img}` : img;
  }
  return img;
};

const DEFAULT_ROOMS = [
  "Modular Kitchen",
  "Modular Wardrobes",
  "Furniture",
  "Vanity",
  "Study Table",
  "Modular Doors",
  "Crockery Unit",
  "TV Unit",
  "Others",
  "Custom",
  "+ Add More",
];

const DEFAULT_CATEGORY_SUB_ITEMS = {
  "Modular Kitchen": [
    "Acrylic Finish Kitchen",
    "PU Finish Kitchen",
    "Laminate Finish Kitchen",
    "Veneer Finish Kitchen",
    "Glass Shutter Kitchen",
    "Handleless Profile Kitchen",
    "+ Add More",
  ],
  "Modular Wardrobes": [
    "Laminated Wardrobes",
    "Lacquered Glass Wardrobes",
    "Italian Wardrobes",
    "PU Wardrobes",
    "PU European Wardrobes",
    "Veneer Wardrobes",
    "+ Add More",
  ],
  Furniture: [
    "Modular Bed",
    "Modular Bed with Back Panel",
    "Modular Dresser",
    "Modern Dining Table with Chair",
    "+ Add More",
  ],
  Vanity: [
    "Double Vanity",
    "Floating Vanity",
    "Modern Vanity",
    "Traditional Vanity",
    "+ Add More",
  ],
  "Study Table": [
    "Classic Modern Study Table",
    "Classic Veneer Study Table",
    "Contemporary Study Table",
    "Modern Study Table",
    "+ Add More",
  ],
  "Modular Doors": [
    "Classic Modern Door",
    "Classic Veneer Door",
    "Modular Contemporary Door",
    "Modular Metallic Door",
    "Modern Door",
    "+ Add More",
  ],
  "Crockery Unit": [
    "Classic Modern Bar and Unit",
    "Classic Modern Crockery Unit",
    "Classic Veneer Bar Unit",
    "Classic Veneer Crockery Unit",
    "Modern Bar Unit",
    "Modern Crockery Unit",
    "+ Add More",
  ],
  "TV Unit": [
    "Classic TV Unit",
    "Contemporary TV Unit",
    "European TV Unit",
    "Modern TV Unit",
    "+ Add More",
  ],
  Others: [
    "Pooja Unit",
    "Shoe Rack",
    "Foyer Console",
    "Partition Screen",
    "+ Add More",
  ],
};

const DEFAULT_MATERIAL_OPTIONS = [
  "HDHMR Board – Action Tesa",
  "BWP Plywood – Century / Greenply",
  "MDF Board",
  "Particle Board",
  "Blockboard",
  "Veneer",
  "Laminate – Merino / Royale Touche",
  "Acrylic Sheet",
  "PVC / WPC Board",
  "+ Add More",
];

const DEFAULT_HARDWARE_OPTIONS = [
  "Hettich Soft Close",
  "Hafele Soft Close",
  "Ebco Soft Close",
  "Blum Soft Close",
  "Standard Hardware",
  "+ Add More",
];

const DEFAULT_STANDALONE_ACCESSORY_OPTIONS = [
  "Soft Close Hinges",
  "Cutlery Basket",
  "Drawer Channel",
  "Bottle Pull-Out",
  "Tandem Box",
  "Magic Corner",
  "Wardrobe Accessories",
  "Kitchen Accessories",
  "Other Accessories",
  "+ Add More",
];

const DEFAULT_STANDALONE_HARDWARE_OPTIONS = [
  "Hettich Soft Close",
  "Hafele Soft Close",
  "Ebco Soft Close",
  "Blum",
  "Godrej",
  "Other Hardware",
  "+ Add More",
];

const DEFAULT_ACCESSORY_OPTIONS = [
  "Wicker Basket",
  "BPO (Bottle Pull Out)",
  "Innotech Drawers",
  "Tandem Box",
  "Corner Carousel",
  "Cutlery Tray",
  "+ Add More",
];

const DEFAULT_ACCESSORY_PRICES = {
  "Wicker Basket": 1500,
  "BPO (Bottle Pull Out)": 2500,
  "Innotech Drawers": 4500,
  "Tandem Box": 3800,
  "Corner Carousel": 6500,
  "Cutlery Tray": 1200,
};

const DEFAULT_DESCRIPTION_OPTIONS = [
  "HDHMR Carcass with High Gloss Acrylic",
  "BWP Ply Carcass with PU Finish",
  "Laminate Finish with Soft-Close Fittings",
  "Modular Factory Finish with Hardware",
  "Standard Factory Specifications",
  "+ Add More",
];

const DEFAULT_MILESTONES = [
  {
    milestoneName: "Booking Token",
    percentage: 10,
    amount: 0,
    stage: "Initial layout & survey",
  },
  {
    milestoneName: "Design & 3D Finalization",
    percentage: 20,
    amount: 0,
    stage: "3D renders & material approval",
  },
  {
    milestoneName: "Civil & Material Procurement",
    percentage: 25,
    amount: 0,
    stage: "Civil work & raw materials",
  },
  {
    milestoneName: "Modular Factory Production",
    percentage: 20,
    amount: 0,
    stage: "Factory fabrication of carcasses",
  },
  {
    milestoneName: "Installation & Finishing",
    percentage: 20,
    amount: 0,
    stage: "Onsite assembly & hardware fit",
  },
  {
    milestoneName: "Final Handover & Snagging",
    percentage: 5,
    amount: 0,
    stage: "Quality audit & handover",
  },
];

export default function QuotationModule({
  LayoutComponent,
  title = "Quotations & Proposals",
  subRoute = "list",
  quotationId = null,
  basePath = "/quotations",
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("quotations"); // 'quotations', 'revisions', 'invoices'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQuotationPaymentModal, setShowQuotationPaymentModal] =
    useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [quotationPaymentForm, setQuotationPaymentForm] = useState({
    amount: "",
    paymentMethod: "UPI",
    referenceId: "",
    notes: "",
  });

  // Form Step in Creator (1: Client/Project, 2: Rooms/Items, 3: Pricing/GST, 4: Milestones/Save)
  const [formStep, setFormStep] = useState(1);
  const [editingQuotationId, setEditingQuotationId] = useState(null);

  // Step 1 Form
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectType, setProjectType] = useState("Residential Interior");
  const [siteLocation, setSiteLocation] = useState("");

  // Step 2 Form
  const [roomCategories, setRoomCategories] = useState(DEFAULT_ROOMS);
  const [subItemMap, setSubItemMap] = useState(DEFAULT_CATEGORY_SUB_ITEMS);
  const [selectedRoom, setSelectedRoom] = useState("Modular Kitchen");
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [showCustomSubItemInput, setShowCustomSubItemInput] = useState(false);
  const [customSubItemName, setCustomSubItemName] = useState("");
  const [items, setItems] = useState([]);
  // Item Sub-form
  const DEFAULT_UNITS = ["Sq Ft", "Lumpsum", "Pieces", "+ Add More"];
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [customUnitName, setCustomUnitName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [descriptionOptions, setDescriptionOptions] = useState(
    DEFAULT_DESCRIPTION_OPTIONS,
  );
  const [showCustomDescriptionInput, setShowCustomDescriptionInput] =
    useState(false);
  const [customDescriptionText, setCustomDescriptionText] = useState("");
  const [itemUnit, setItemUnit] = useState("Sq Ft");
  const [itemSize, setItemSize] = useState("1");
  const [itemRate, setItemRate] = useState("");
  const [materialOptions, setMaterialOptions] = useState(
    DEFAULT_MATERIAL_OPTIONS,
  );
  const [showCustomMaterialInput, setShowCustomMaterialInput] = useState(false);
  const [customMaterialName, setCustomMaterialName] = useState("");

  const [hardwareOptions, setHardwareOptions] = useState(
    DEFAULT_HARDWARE_OPTIONS,
  );
  const [showCustomHardwareInput, setShowCustomHardwareInput] = useState(false);
  const [customHardwareName, setCustomHardwareName] = useState("");

  const [accessoryOptions, setAccessoryOptions] = useState(
    DEFAULT_ACCESSORY_OPTIONS,
  );
  const [showCustomAccessoryInput, setShowCustomAccessoryInput] =
    useState(false);
  const [customAccessoryName, setCustomAccessoryName] = useState("");

  const [specCarcass, setSpecCarcass] = useState("HDHMR Board – Action Tesa");
  const [specShutter, setSpecShutter] = useState("Acrylic Finish");
  const [specFinish, setSpecFinish] = useState("High Gloss Acrylic");
  const [specBrand, setSpecBrand] = useState("Action TESA / Merino");
  const [specHardware, setSpecHardware] = useState("Hettich Soft Close");
  const [specThickness, setSpecThickness] = useState("18mm");
  const [accName, setAccName] = useState("");
  const [accUnitPrice, setAccUnitPrice] = useState("1500");
  const [accQty, setAccQty] = useState("1");
  const [itemAccessories, setItemAccessories] = useState([]);
  const [itemRemarks, setItemRemarks] = useState("");

  // Step 3 Standalone Accessories Form
  const [standaloneAccessories, setStandaloneAccessories] = useState([]);
  const [accFormName, setAccFormName] = useState("");
  const [accFormDesc, setAccFormDesc] = useState("");
  const [accFormImage, setAccFormImage] = useState("");
  const [accFormImages, setAccFormImages] = useState([]);
  const [accFormImageId, setAccFormImageId] = useState("");
  const [showAccGalleryModal, setShowAccGalleryModal] = useState(false);
  const [accGallerySearch, setAccGallerySearch] = useState("");
  const [accGalleryCategory, setAccGalleryCategory] = useState("All");
  const [catalogAccessories, setCatalogAccessories] = useState(PREDEFINED_ACCESSORIES);
  const [modalSelectedItems, setModalSelectedItems] = useState([]);
  const [showAddCustomModalItem, setShowAddCustomModalItem] = useState(false);
  const [customModalItemName, setCustomModalItemName] = useState("");
  const [customModalItemCategory, setCustomModalItemCategory] = useState("Kitchen Accessories");
  const [customModalItemImage, setCustomModalItemImage] = useState("");
  const [accFormQty, setAccFormQty] = useState("1");
  const [accFormUnit, setAccFormUnit] = useState("Pcs");
  const [accFormPrice, setAccFormPrice] = useState("");
  const [editingAccIndex, setEditingAccIndex] = useState(null);

  const filteredPredefinedAccessories = useMemo(() => {
    return catalogAccessories.filter((item) => {
      const q = accGallerySearch.trim().toLowerCase();
      const matchesSearch = !q || item.name.toLowerCase().includes(q);
      const matchesCategory =
        accGalleryCategory === "All" ||
        item.category.toLowerCase().includes(accGalleryCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [catalogAccessories, accGallerySearch, accGalleryCategory]);

  const [stAccessoryOptions, setStAccessoryOptions] = useState(
    DEFAULT_STANDALONE_ACCESSORY_OPTIONS,
  );
  const [showStAccCustomAccessory, setShowStAccCustomAccessory] =
    useState(false);
  const [stAccCustomAccessory, setStAccCustomAccessory] = useState("");

  const [stAccHardwareOptions, setStAccHardwareOptions] = useState(
    DEFAULT_STANDALONE_HARDWARE_OPTIONS,
  );
  const [showStAccCustomHardware, setShowStAccCustomHardware] = useState(false);
  const [stAccCustomHardware, setStAccCustomHardware] = useState("");

  // Step 4 Pricing & Taxes Form
  const [handlingPercent, setHandlingPercent] = useState("2");
  const [designPercent, setDesignPercent] = useState("2");
  const [transportCharges, setTransportCharges] = useState("0");
  const [discountType, setDiscountType] = useState("PERCENT");
  const [discountValue, setDiscountValue] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [gstType, setGstType] = useState("AS_PER_ACTUAL");

  // Step 4 Form
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [quotationNotes, setQuotationNotes] = useState("");

  // Email Modal Form
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Invoice Form & Payment Form for Invoices tab
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: "",
    projectName: "",
    description: "Milestone 1: Civil & Modular Advance",
    amount: 250000,
    gstRate: 18,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    method: "Bank Transfer (NEFT/RTGS)",
    transactionRef: "",
    notes: "",
  });

  const fetchQuotationConfig = async () => {
    try {
      const res = await api.get("/quotations/config");
      const cfg = res.data?.data || res.data;
      if (cfg) {
        if (
          Array.isArray(cfg.standaloneAccessoryOptions) &&
          cfg.standaloneAccessoryOptions.length > 0
        ) {
          const list = [...cfg.standaloneAccessoryOptions];
          if (!list.includes("+ Add More")) list.push("+ Add More");
          setStAccessoryOptions(list);
        }
        if (
          Array.isArray(cfg.standaloneHardwareOptions) &&
          cfg.standaloneHardwareOptions.length > 0
        ) {
          const list = [...cfg.standaloneHardwareOptions];
          if (!list.includes("+ Add More")) list.push("+ Add More");
          setStAccHardwareOptions(list);
        }
      }
    } catch (err) {
      console.warn("Error loading quotation config:", err);
    }
  };

  useEffect(() => {
    fetchQuotationConfig();

    let socket;
    try {
      socket = io(SOCKET_URL);
      socket.on("quotation_config_updated", (updated) => {
        if (updated) {
          if (Array.isArray(updated.standaloneAccessoryOptions)) {
            const list = [...updated.standaloneAccessoryOptions];
            if (!list.includes("+ Add More")) list.push("+ Add More");
            setStAccessoryOptions(list);
          }
          if (Array.isArray(updated.standaloneHardwareOptions)) {
            const list = [...updated.standaloneHardwareOptions];
            if (!list.includes("+ Add More")) list.push("+ Add More");
            setStAccHardwareOptions(list);
          }
        }
      });
    } catch (e) {
      console.warn("Socket connection error in QuotationModule:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, statusFilter]);

  useEffect(() => {
    if (subRoute === "create") {
      handleOpenCreateModal();
    } else if ((subRoute === "edit" || subRoute === "view") && quotationId) {
      fetchSingleQuotation(quotationId, subRoute);
    }
  }, [subRoute, quotationId]);

  const fetchSingleQuotation = async (id, mode) => {
    try {
      const res = await api.get(`/quotations/${id}`);
      const doc = res.data?.quotation || res.data?.data || res.data;
      if (doc) {
        if (mode === "edit") {
          handleOpenCreateModal(doc);
        } else if (mode === "view") {
          setSelectedQuotation(doc);
          setShowDetailModal(true);
        }
      }
    } catch (err) {
      console.error("Error fetching single quotation:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "quotations" || activeTab === "revisions") {
        const params = {};
        if (statusFilter !== "ALL") params.status = statusFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const [resList, resSum] = await Promise.all([
          api.get("/quotations", { params }),
          api.get("/quotations/summary").catch(() => null),
        ]);

        const list = resList.data?.quotations || resList.data?.data || [];
        setQuotations(list);
        if (resSum?.data?.summary) {
          setSummary(resSum.data.summary);
        }
      } else if (activeTab === "invoices") {
        const res = await api.get("/finance/invoices");
        setInvoices(res.data.data || []);
      }
    } catch (err) {
      setError("Failed to fetch data from backend server.");
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
        (item.quotationNumber &&
          item.quotationNumber.toLowerCase().includes(q)) ||
        (item.client?.name && item.client.name.toLowerCase().includes(q)) ||
        (item.projectTitle && item.projectTitle.toLowerCase().includes(q)) ||
        (item.client?.phone && item.client.phone.includes(q)),
    );
  }, [quotations, searchQuery]);

  // Live Pricing Calculation for Modal
  const liveCalc = useMemo(() => {
    const addedItemsSub = items.reduce((acc, it) => {
      const baseAmt = Math.round((it.quantity || 1) * (it.rate || 0));
      const accTotal = (it.accessories || []).reduce((sum, a) => {
        if (
          a.name &&
          it.name &&
          a.name.trim().toLowerCase() === it.name.trim().toLowerCase()
        )
          return sum;
        return (
          sum +
          (a.cost !== undefined
            ? Number(a.cost)
            : (Number(a.qty) || 1) * (Number(a.unitPrice) || 0))
        );
      }, 0);
      const expected = baseAmt + accTotal;
      const effectiveItemAmt =
        it.amount !== undefined && Number(it.amount) > expected
          ? Number(it.amount)
          : expected;
      return acc + effectiveItemAmt;
    }, 0);

    const sizeNum =
      parseFloat(itemSize) > 0 ? parseFloat(itemSize) : itemRate ? 1 : 0;
    const rateNum = parseFloat(itemRate) || 0;
    const draftBaseAmt = Math.round(sizeNum * rateNum);
    const draftAccAmt = (itemAccessories || []).reduce(
      (sum, a) =>
        sum +
        (a.cost !== undefined
          ? Number(a.cost)
          : (Number(a.qty) || 1) * (Number(a.unitPrice) || 0)),
      0,
    );
    const currentDraftAmt = draftBaseAmt + draftAccAmt;

    const itemsSubtotal = addedItemsSub + currentDraftAmt;

    const standaloneAccSubtotal = standaloneAccessories.reduce((sum, acc) => {
      const q = parseFloat(acc.quantity) || 0;
      const p = parseFloat(acc.price) || 0;
      return (
        sum + (acc.total !== undefined ? Number(acc.total) : Math.round(q * p))
      );
    }, 0);

    const sub = itemsSubtotal + standaloneAccSubtotal;

    const handlingFee = Math.round(
      sub * ((parseFloat(handlingPercent) || 0) / 100),
    );
    const designFee = Math.round(
      sub * ((parseFloat(designPercent) || 0) / 100),
    );
    const transportAmt = Math.max(0, parseFloat(transportCharges) || 0);

    const discVal = parseFloat(discountValue) || 0;
    const discountAmt =
      discountType === "PERCENT"
        ? Math.round(sub * (discVal / 100))
        : Math.min(sub, discVal);
    const taxable = Math.max(
      0,
      sub + handlingFee + designFee + transportAmt - discountAmt,
    );
    const gstPct = parseFloat(gstPercent) || 0;
    const gstAmt =
      gstType === "AS_PER_ACTUAL" ? 0 : Math.round(taxable * (gstPct / 100));
    const grandTotal = taxable + gstAmt;

    const totalMilestonePct = milestones.reduce(
      (acc, m) => acc + (Number(m.percentage) || 0),
      0,
    );
    const isMilestoneValid = Math.abs(totalMilestonePct - 100) < 0.5;

    return {
      itemsSubtotal,
      standaloneAccSubtotal,
      sub,
      addedSub: addedItemsSub,
      currentDraftAmt,
      handlingFee,
      designFee,
      transportAmt,
      discountAmt,
      taxable,
      gstAmt,
      grandTotal,
      totalMilestonePct,
      isMilestoneValid,
    };
  }, [
    items,
    itemSize,
    itemRate,
    itemAccessories,
    standaloneAccessories,
    handlingPercent,
    designPercent,
    transportCharges,
    discountType,
    discountValue,
    gstPercent,
    gstType,
    milestones,
  ]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────

  const handleConfirmCustomStAccHardware = async () => {
    const trimmed = stAccCustomHardware.trim();
    if (!trimmed) return;

    if (!stAccHardwareOptions.includes(trimmed)) {
      setStAccHardwareOptions((prev) => {
        const copy = [...prev];
        const addMoreIdx = copy.indexOf("+ Add More");
        if (addMoreIdx !== -1) {
          copy.splice(addMoreIdx, 0, trimmed);
        } else {
          copy.push(trimmed);
        }
        return copy;
      });
    }

    setAccFormDesc(trimmed);
    setStAccCustomHardware("");
    setShowStAccCustomHardware(false);

    try {
      await api.post("/quotations/config/options", {
        type: "standaloneHardware",
        option: trimmed,
      });
    } catch (err) {
      console.warn("Failed to persist custom hardware option:", err);
    }
  };

  const handleAddOrUpdateStandaloneAccessory = () => {
    const name = accFormName.trim();
    if (!name) {
      alert("Please enter accessory name.");
      return;
    }
    const qty = Math.max(0, parseFloat(accFormQty) || 1);
    const price = Math.max(0, parseFloat(accFormPrice) || 0);
    const total = Math.round(qty * price);

    const finalHardware = showStAccCustomHardware
      ? stAccCustomHardware.trim()
      : accFormDesc.trim();
    if (
      showStAccCustomHardware &&
      finalHardware &&
      !stAccHardwareOptions.includes(finalHardware)
    ) {
      setStAccHardwareOptions((prev) => {
        const copy = [...prev];
        copy.splice(copy.length - 1, 0, finalHardware);
        return copy;
      });
      api.post("/quotations/config/options", {
        type: "standaloneHardware",
        option: finalHardware,
      }).catch(console.warn);
    }

    if (
      showStAccCustomAccessory &&
      name &&
      !stAccessoryOptions.includes(name)
    ) {
      api.post("/quotations/config/options", {
        type: "standaloneAccessory",
        option: name,
      }).catch(console.warn);
    }

    const finalImages = accFormImages && accFormImages.length > 0
      ? accFormImages
      : (accFormImage ? [accFormImage] : []);
    const newAcc = {
      name,
      description: finalHardware,
      image: finalImages[0] || "",
      images: finalImages,
      imageId: accFormImageId || "",
      quantity: qty,
      unit: accFormUnit.trim() || "Pcs",
      price,
      total,
    };

    if (editingAccIndex !== null && editingAccIndex >= 0) {
      const updated = [...standaloneAccessories];
      updated[editingAccIndex] = newAcc;
      setStandaloneAccessories(updated);
      setEditingAccIndex(null);
    } else {
      setStandaloneAccessories([...standaloneAccessories, newAcc]);
    }

    setAccFormName("");
    setAccFormDesc("");
    setShowStAccCustomHardware(false);
    setStAccCustomHardware("");
    setAccFormImage("");
    setAccFormImages([]);
    setAccFormImageId("");
    setAccFormQty("1");
    setAccFormUnit("Pcs");
    setAccFormPrice("");
  };

  const handleEditStandaloneAccessory = (index) => {
    const acc = standaloneAccessories[index];
    if (!acc) return;
    setAccFormName(acc.name || "");
    const desc = acc.description || "";
    if (stAccHardwareOptions.includes(desc)) {
      setAccFormDesc(desc);
      setShowStAccCustomHardware(false);
    } else {
      setAccFormDesc("+ Add More");
      setShowStAccCustomHardware(true);
      setStAccCustomHardware(desc);
    }
    const accImgs = Array.isArray(acc.images) && acc.images.length > 0
      ? acc.images
      : (acc.image ? [acc.image] : []);
    setAccFormImage(accImgs[0] || "");
    setAccFormImages(accImgs);
    setAccFormImageId(acc.imageId || "");
    setAccFormQty(String(acc.quantity || 1));
    setAccFormUnit(acc.unit || "Pcs");
    setAccFormPrice(String(acc.price || 0));
    setEditingAccIndex(index);
  };

  const handleDeleteStandaloneAccessory = (index) => {
    setStandaloneAccessories(
      standaloneAccessories.filter((_, i) => i !== index),
    );
    if (editingAccIndex === index) {
      setEditingAccIndex(null);
      setAccFormName("");
      setAccFormDesc("");
      setAccFormImage("");
      setAccFormImages([]);
      setAccFormImageId("");
      setAccFormQty("1");
      setAccFormUnit("Pcs");
      setAccFormPrice("");
    }
  };

  const handleAccImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles = files.filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        alert(`File ${f.name} exceeds 10MB limit.`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    let loaded = 0;
    const newResults = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newResults.push(reader.result);
        loaded++;
        if (loaded === validFiles.length) {
          setAccFormImages((prev) => {
            const combined = [...prev, ...newResults];
            setAccFormImage(combined[0] || "");
            return combined;
          });
          setAccFormImageId("");
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveSingleAccFormImage = (indexToRemove) => {
    setAccFormImages((prev) => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      setAccFormImage(updated[0] || "");
      return updated;
    });
  };

  const handleToggleModalItemSelect = (item) => {
    setModalSelectedItems((prev) => {
      const exists = prev.some((it) => it.id === item.id || it.image === item.image);
      if (exists) {
        return prev.filter((it) => it.id !== item.id && it.image !== item.image);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleApplyModalSelection = () => {
    if (modalSelectedItems.length === 0) {
      setShowAccGalleryModal(false);
      return;
    }
    const newImgs = modalSelectedItems.map((it) => it.image).filter(Boolean);
    setAccFormImages((prev) => {
      // Merge unique
      const combined = [...prev];
      newImgs.forEach((img) => {
        if (!combined.includes(img)) combined.push(img);
      });
      setAccFormImage(combined[0] || "");
      return combined;
    });
    setAccFormImageId(modalSelectedItems[0]?.id || "");
    if (!accFormName.trim() && modalSelectedItems.length === 1) {
      setAccFormName(modalSelectedItems[0].name);
    }
    setShowAccGalleryModal(false);
  };

  const handleBatchAddModalItems = () => {
    if (modalSelectedItems.length === 0) return;
    const newRows = modalSelectedItems.map((item) => ({
      name: item.name,
      description: item.category,
      image: item.image,
      images: [item.image],
      imageId: item.id || "",
      quantity: 1,
      unit: "Pcs",
      price: 0,
      total: 0,
    }));
    setStandaloneAccessories((prev) => [...prev, ...newRows]);
    setModalSelectedItems([]);
    setShowAccGalleryModal(false);
  };

  const handleCustomModalItemUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size should not exceed 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomModalItemImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomModalItem = () => {
    if (!customModalItemName.trim()) {
      alert("Please enter a name for the accessory.");
      return;
    }
    if (!customModalItemImage) {
      alert("Please select or upload an image for the accessory.");
      return;
    }
    const newItem = {
      id: `custom-${Date.now()}`,
      name: customModalItemName.trim(),
      category: customModalItemCategory,
      image: customModalItemImage,
      isCustom: true,
    };
    setCatalogAccessories((prev) => [newItem, ...prev]);
    setModalSelectedItems((prev) => [...prev, newItem]);
    setCustomModalItemName("");
    setCustomModalItemImage("");
    setShowAddCustomModalItem(false);
  };

  const handleSelectRoom = (r) => {
    if (r === "Custom" || r === "+ Add More") {
      setShowCustomCategoryInput(true);
      return;
    }
    setSelectedRoom(r);
    setShowCustomCategoryInput(false);
    setShowCustomSubItemInput(false);

    const availableSubItems =
      subItemMap[r] || DEFAULT_CATEGORY_SUB_ITEMS[r] || [];
    const firstSubItem = availableSubItems.find(
      (item) => item !== "+ Add More",
    );
    if (firstSubItem) {
      setItemName(firstSubItem);
    }
  };

  const handleConfirmCustomRoom = () => {
    const trimmed = customCategoryName.trim();
    if (!trimmed) return;

    if (!roomCategories.includes(trimmed)) {
      const updatedCategories = [...roomCategories];
      const addMoreIdx = updatedCategories.findIndex(
        (c) => c === "+ Add More" || c === "Custom",
      );
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
        [trimmed]: ["Standard Item", "+ Add More"],
      }));
    }

    setSelectedRoom(trimmed);
    setItemName("Standard Item");
    setCustomCategoryName("");
    setShowCustomCategoryInput(false);
  };

  const autoAddSubItemOption = (room, name) => {
    const trimmed = name?.trim();
    if (!trimmed || trimmed === "+ Add More") return;
    const currentSubItems = subItemMap[room] ||
      DEFAULT_CATEGORY_SUB_ITEMS[room] || ["+ Add More"];
    if (!currentSubItems.includes(trimmed)) {
      const updated = [...currentSubItems];
      const addMoreIdx = updated.indexOf("+ Add More");
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
    if (subItem === "+ Add More") {
      setShowCustomSubItemInput(true);
      return;
    }
    setItemName(subItem);
    setShowCustomSubItemInput(false);
  };

  const handleConfirmCustomSubItem = (overrideName) => {
    const raw = typeof overrideName === "string" ? overrideName : customSubItemName;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    autoAddSubItemOption(selectedRoom, trimmed);
    setItemName(trimmed);
    setCustomSubItemName("");
    setShowCustomSubItemInput(false);
  };

  const handleSelectUnit = (u) => {
    if (u === "+ Add More") {
      setShowCustomUnitInput(true);
      return;
    }
    setItemUnit(u);
    setShowCustomUnitInput(false);
  };

  const handleSelectDescription = (desc) => {
    if (desc === "+ Add More") {
      setShowCustomDescriptionInput(true);
      return;
    }
    setItemDesc(desc);
    setShowCustomDescriptionInput(false);
  };

  const handleConfirmCustomDescription = (overrideVal) => {
    const raw = typeof overrideVal === "string" ? overrideVal : customDescriptionText;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!descriptionOptions.includes(trimmed)) {
      const updated = [...descriptionOptions];
      const addMoreIdx = updated.indexOf("+ Add More");
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setDescriptionOptions(updated);
    }

    setItemDesc(trimmed);
    setCustomDescriptionText("");
    setShowCustomDescriptionInput(false);
  };

  const handleConfirmCustomUnit = (overrideName) => {
    const raw = typeof overrideName === "string" ? overrideName : customUnitName;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!unitOptions.includes(trimmed)) {
      const updated = [...unitOptions];
      const addMoreIdx = updated.indexOf("+ Add More");
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setUnitOptions(updated);
    }

    setItemUnit(trimmed);
    setCustomUnitName("");
    setShowCustomUnitInput(false);
  };

  const handleSelectMaterial = (m) => {
    if (m === "+ Add More") {
      setShowCustomMaterialInput(true);
      return;
    }
    setSpecCarcass(m);
    setShowCustomMaterialInput(false);
  };

  const handleConfirmCustomMaterial = (overrideName) => {
    const raw = typeof overrideName === "string" ? overrideName : customMaterialName;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!materialOptions.includes(trimmed)) {
      const updated = [...materialOptions];
      const addMoreIdx = updated.indexOf("+ Add More");
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setMaterialOptions(updated);
    }

    setSpecCarcass(trimmed);
    setCustomMaterialName("");
    setShowCustomMaterialInput(false);
  };

  const handleSelectHardware = (h) => {
    if (h === "+ Add More") {
      setShowCustomHardwareInput(true);
      return;
    }
    setSpecHardware(h);
    setShowCustomHardwareInput(false);
  };

  const handleConfirmCustomHardware = (overrideName) => {
    const raw = typeof overrideName === "string" ? overrideName : customHardwareName;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!hardwareOptions.includes(trimmed)) {
      const updated = [...hardwareOptions];
      const addMoreIdx = updated.indexOf("+ Add More");
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setHardwareOptions(updated);
    }

    setSpecHardware(trimmed);
    setCustomHardwareName("");
    setShowCustomHardwareInput(false);
  };

  const handleConfirmCustomStAccAccessory = async (overrideName) => {
    const raw = typeof overrideName === "string" ? overrideName : stAccCustomAccessory;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!stAccessoryOptions.includes(trimmed)) {
      const updated = [...stAccessoryOptions];
      const addMoreIdx = updated.indexOf("+ Add More");
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setStAccessoryOptions(updated);
    }

    setAccFormName(trimmed);
    setStAccCustomAccessory("");
    setShowStAccCustomAccessory(false);

    try {
      await api.post("/quotations/config/options", {
        type: "standaloneAccessory",
        option: trimmed,
      });
    } catch (err) {
      console.warn("Failed to persist custom accessory option:", err);
    }
  };

  const handleSelectAccessory = (acc) => {
    if (acc === "+ Add More") {
      setShowCustomAccessoryInput(true);
      return;
    }
    setAccName(acc);
    const price = DEFAULT_ACCESSORY_PRICES[acc] || 1500;
    setAccUnitPrice(String(price));
    setAccQty("1");
    setShowCustomAccessoryInput(false);
  };

  const handleConfirmCustomAccessory = (overrideName) => {
    const raw = typeof overrideName === "string" ? overrideName : customAccessoryName;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!accessoryOptions.includes(trimmed)) {
      const updated = [...accessoryOptions];
      const addMoreIdx = updated.indexOf("+ Add More");
      if (addMoreIdx !== -1) {
        updated.splice(addMoreIdx, 0, trimmed);
      } else {
        updated.push(trimmed);
      }
      setAccessoryOptions(updated);
    }

    setAccName(trimmed);
    setAccUnitPrice("1500");
    setAccQty("1");
    setCustomAccessoryName("");
    setShowCustomAccessoryInput(false);
  };

  const handleAddAccessory = () => {
    const trimmed = accName.trim();
    if (!trimmed) return;
    const qty = Math.max(1, parseInt(accQty, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(accUnitPrice) || 0);
    const cost = Math.round(qty * unitPrice);

    setItemAccessories([
      ...itemAccessories,
      { name: trimmed, qty, unitPrice, cost, inclusionType: "INCLUDED" },
    ]);
    setAccName("");
    setAccUnitPrice("1500");
    setAccQty("1");
  };

  const handleAddAccessoryToScope = () => {
    const trimmed = accName.trim();
    if (!trimmed) {
      alert("Please select or enter an accessory name.");
      return;
    }
    const qty = Math.max(1, parseInt(accQty, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(accUnitPrice) || 0);
    const cost = Math.round(qty * unitPrice);

    const newItem = {
      itemNumber: items.length + 1,
      room: selectedRoom || "Modular Kitchen",
      name: trimmed,
      description: `Accessory (${trimmed})`,
      unit: "Pieces",
      quantity: qty,
      rate: unitPrice,
      amount: cost,
      specifications: {
        carcass: specCarcass,
        shutter: specShutter,
        finish: specFinish,
        brand: specBrand,
        hardware: specHardware,
        thickness: specThickness,
      },
      accessories: [],
      remarks: itemRemarks.trim(),
      scope: "COMPANY_SCOPE",
      costVariationNote: "Cost may vary as per site measurements.",
    };

    setItems([...items, newItem]);
    setAccName("");
    setAccUnitPrice("1500");
    setAccQty("1");
  };

  const handleUpdateAccessoryQty = (index, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    const updated = [...itemAccessories];
    const acc = updated[index];
    acc.qty = qty;
    acc.cost = Math.round(qty * (acc.unitPrice || 0));
    setItemAccessories(updated);
  };

  const handleUpdateItemQty = (index, newQty) => {
    const qty = Math.max(0.01, parseFloat(newQty) || 0);
    const updated = [...items];
    const it = updated[index];
    it.quantity = qty;
    const baseAmt = Math.round(qty * (it.rate || 0));
    const accTotal = (it.accessories || []).reduce((sum, a) => {
      if (
        a.name &&
        it.name &&
        a.name.trim().toLowerCase() === it.name.trim().toLowerCase()
      )
        return sum;
      return (
        sum +
        (a.cost !== undefined
          ? Number(a.cost)
          : (Number(a.qty) || 1) * (Number(a.unitPrice) || 0))
      );
    }, 0);
    it.amount = baseAmt + accTotal;
    setItems(updated);
  };

  const handleUpdateItemRate = (index, newRate) => {
    const rate = Math.max(0, parseFloat(newRate) || 0);
    const updated = [...items];
    const it = updated[index];
    it.rate = rate;
    const baseAmt = Math.round((it.quantity || 1) * rate);
    const accTotal = (it.accessories || []).reduce((sum, a) => {
      if (
        a.name &&
        it.name &&
        a.name.trim().toLowerCase() === it.name.trim().toLowerCase()
      )
        return sum;
      return (
        sum +
        (a.cost !== undefined
          ? Number(a.cost)
          : (Number(a.qty) || 1) * (Number(a.unitPrice) || 0))
      );
    }, 0);
    it.amount = baseAmt + accTotal;
    setItems(updated);
  };

  const handleAddItem = () => {
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      alert("Please enter an item name.");
      return;
    }

    autoAddSubItemOption(selectedRoom, trimmedName);

    const rateNum = parseFloat(itemRate) || 0;
    const sizeNum = parseFloat(itemSize) || 0;
    const qtyNum = sizeNum > 0 ? sizeNum : 1;
    const baseAmt = Math.round(qtyNum * rateNum);
    const accTotalAmt = itemAccessories.reduce(
      (sum, acc) =>
        sum +
        (acc.cost !== undefined
          ? acc.cost
          : (acc.qty || 1) * (acc.unitPrice || 0)),
      0,
    );
    const itemAmt = baseAmt + accTotalAmt;

    const newItem = {
      itemNumber: items.length + 1,
      room: selectedRoom,
      name: trimmedName,
      description: itemDesc.trim(),
      unit: itemUnit || "Sq Ft",
      measurements: { length: 0, width: 0, height: 0, calculatedArea: sizeNum },
      quantity: qtyNum,
      rate: rateNum,
      amount: itemAmt,
      specifications: {
        carcass: specCarcass,
        shutter: specShutter,
        finish: specFinish,
        brand: specBrand,
        hardware: specHardware,
        thickness: specThickness,
      },
      accessories: itemAccessories,
      remarks: itemRemarks.trim(),
      scope: "COMPANY_SCOPE",
      costVariationNote: "Cost may vary as per site measurements.",
    };

    setItems([...items, newItem]);
    setItemName("");
    setItemDesc("");
    setItemSize("1");
    setItemRate("");
    setItemAccessories([]);
    setItemRemarks("");
  };

  const handleOpenCreateModal = (existing = null) => {
    if (existing) {
      setEditingQuotationId(existing._id);
      setClientName(existing.client?.name || "");
      setClientCompany(existing.client?.company || "");
      setClientPhone(existing.client?.phone || "");
      setClientEmail(existing.client?.email || "");
      setClientAddress(existing.client?.address || "");
      setClientGstin(existing.client?.gstin || "");
      setProjectTitle(existing.projectTitle || "");
      setProjectType(existing.projectType || "Residential Interior");
      setSiteLocation(existing.siteLocation || "");
      const existingItems = existing.items || [];
      setItems(existingItems);

      const updatedCategories = [...roomCategories];
      const updatedSubMap = { ...subItemMap };

      existingItems.forEach((it) => {
        if (it.room && !updatedCategories.includes(it.room)) {
          const addMoreIdx = updatedCategories.findIndex(
            (c) => c === "+ Add More" || c === "Custom",
          );
          if (addMoreIdx !== -1) {
            updatedCategories.splice(addMoreIdx, 0, it.room);
          } else {
            updatedCategories.push(it.room);
          }
        }
        if (it.room && it.name) {
          const currentList = updatedSubMap[it.room] || ["+ Add More"];
          if (!currentList.includes(it.name)) {
            const newList = [...currentList];
            const addMoreIdx = newList.indexOf("+ Add More");
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

      const firstRoom = existingItems[0]?.room || "Modular Kitchen";
      setSelectedRoom(firstRoom);
      setItemName(
        existingItems[0]?.name ||
          (updatedSubMap[firstRoom]?.[0] !== "+ Add More"
            ? updatedSubMap[firstRoom]?.[0]
            : ""),
      );

      setHandlingPercent(String(existing.pricing?.handlingFeePercent || 2));
      setDesignPercent(String(existing.pricing?.designFeePercent || 2));
      setTransportCharges(String(existing.pricing?.transportCharges || 0));
      setDiscountType(existing.pricing?.discountType || "PERCENT");
      setDiscountValue(String(existing.pricing?.discountValue || 0));
      setGstPercent(String(existing.pricing?.gstPercent || 18));
      setGstType(existing.pricing?.gstType || "AS_PER_ACTUAL");
      setStandaloneAccessories(existing.standaloneAccessories || []);
      setAccFormName("");
      setAccFormDesc("");
      setAccFormImage("");
      setAccFormImages([]);
      setAccFormImageId("");
      setAccFormQty("1");
      setAccFormUnit("Pcs");
      setAccFormPrice("");
      setEditingAccIndex(null);
      setMilestones(
        existing.paymentMilestones && existing.paymentMilestones.length > 0
          ? existing.paymentMilestones
          : DEFAULT_MILESTONES,
      );
      setQuotationNotes(existing.notes || "");
    } else {
      setEditingQuotationId(null);
      setClientName("");
      setClientCompany("");
      setClientPhone("");
      setClientEmail("");
      setClientAddress("");
      setClientGstin("");
      setProjectTitle("");
      setProjectType("Residential Interior");
      setSiteLocation("");
      setItems([]);
      setSelectedRoom("Modular Kitchen");
      setItemName(DEFAULT_CATEGORY_SUB_ITEMS["Modular Kitchen"]?.[0] || "");
      setHandlingPercent("2");
      setDesignPercent("2");
      setTransportCharges("0");
      setDiscountType("PERCENT");
      setDiscountValue("0");
      setGstPercent("18");
      setGstType("AS_PER_ACTUAL");
      setStandaloneAccessories([]);
      setAccFormName("");
      setAccFormDesc("");
      setAccFormImage("");
      setAccFormImages([]);
      setAccFormImageId("");
      setAccFormQty("1");
      setAccFormUnit("Pcs");
      setAccFormPrice("");
      setEditingAccIndex(null);
      setMilestones(DEFAULT_MILESTONES);
      setQuotationNotes("");
    }
    setShowCustomCategoryInput(false);
    setShowCustomSubItemInput(false);
    setFormStep(1);
    setShowCreateModal(true);
  };

  const handleSaveQuotation = async (e) => {
    if (e) e.preventDefault();
    if (!clientName.trim()) {
      alert("Client Name is required.");
      setFormStep(1);
      return;
    }
    let currentItems = [...items];
    if (currentItems.length === 0 && liveCalc.currentDraftAmt > 0) {
      const sizeNum =
        parseFloat(itemSize) > 0 ? parseFloat(itemSize) : itemRate ? 1 : 0;
      const rateNum = parseFloat(itemRate) || 0;
      const baseAmt = Math.round(sizeNum * rateNum);
      const accTotalAmt = (itemAccessories || []).reduce(
        (sum, a) =>
          sum +
          (a.cost !== undefined
            ? Number(a.cost)
            : (Number(a.qty) || 1) * (Number(a.unitPrice) || 0)),
        0,
      );
      const autoItem = {
        itemNumber: 1,
        room: selectedRoom || "Modular Kitchen",
        name: itemName.trim() || selectedRoom || "Modular Kitchen",
        description: itemDesc.trim(),
        unit: itemUnit || "Sq Ft",
        measurements: {
          length: 0,
          width: 0,
          height: 0,
          calculatedArea: sizeNum,
        },
        quantity: sizeNum || 1,
        rate: rateNum,
        amount: baseAmt + accTotalAmt,
        specifications: {
          carcass: specCarcass,
          shutter: specShutter,
          finish: specFinish,
          brand: specBrand,
          hardware: specHardware,
          thickness: specThickness,
        },
        accessories: itemAccessories,
        remarks: itemRemarks.trim(),
        scope: "COMPANY_SCOPE",
        costVariationNote: "Cost may vary as per site measurements.",
      };
      currentItems = [autoItem];
      setItems(currentItems);
    }
    if (currentItems.length === 0 && standaloneAccessories.length === 0) {
      alert(
        "Please add at least one scope item or accessory to the quotation.",
      );
      setFormStep(2);
      return;
    }
    if (!liveCalc.isMilestoneValid) {
      alert(
        `Milestone percentages must equal 100%. Currently: ${liveCalc.totalMilestonePct}%`,
      );
      setFormStep(5);
      return;
    }

    setIsActionLoading(true);
    try {
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      let hasFiles = false;
      const formData = new FormData();
      const updatedStandaloneAccessories = [...standaloneAccessories];

      for (let i = 0; i < updatedStandaloneAccessories.length; i++) {
        const acc = updatedStandaloneAccessories[i];
        if (acc.image && acc.image.startsWith("data:image")) {
          // Convert base64 to Blob
          const res = await fetch(acc.image);
          const blob = await res.blob();

          if (blob.size > MAX_SIZE) {
            alert(
              `The image for accessory "${acc.name}" exceeds the maximum allowed size of 50MB.`,
            );
            setIsActionLoading(false);
            return;
          }

          hasFiles = true;
          const ext = blob.type.split("/")[1] || "jpg";
          const filename = `image_${i}.${ext}`;

          formData.append("images", blob, `idx_${i}_${filename}`);

          // Clear out the base64 from the payload JSON so it doesn't get sent twice
          updatedStandaloneAccessories[i].image = "";
        }
      }

      const payloadObj = {
        client: {
          name: clientName.trim(),
          company: clientCompany.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          address: clientAddress.trim(),
          gstin: clientGstin.trim(),
        },
        projectTitle:
          projectTitle.trim() || `${clientName.trim()} Interior Proposal`,
        projectType,
        siteLocation: siteLocation.trim() || clientAddress.trim(),
        items: currentItems,
        standaloneAccessories: updatedStandaloneAccessories,
        pricing: {
          handlingFeePercent: parseFloat(handlingPercent) || 0,
          designFeePercent: parseFloat(designPercent) || 0,
          transportCharges: parseFloat(transportCharges) || 0,
          discountType,
          discountValue: parseFloat(discountValue) || 0,
          gstPercent: parseFloat(gstPercent) || 18,
          gstType,
        },
        paymentMilestones: milestones,
        notes: quotationNotes.trim(),
      };

      let finalPayload = payloadObj;
      let config = {};

      if (hasFiles) {
        formData.append("data", JSON.stringify(payloadObj));
        finalPayload = formData;
        // MUST be undefined so Axios/browser automatically sets multipart/form-data with the correct boundary!
        config = { headers: { "Content-Type": undefined } };
      }

      if (editingQuotationId) {
        await api.put(
          `/quotations/${editingQuotationId}`,
          finalPayload,
          config,
        );
        setSuccess("Quotation updated successfully!");
      } else {
        await api.post("/quotations", finalPayload, config);
        setSuccess("Quotation generated successfully!");
      }

      setShowCreateModal(false);
      fetchData();
      if (subRoute !== "list") {
        navigate(basePath);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save quotation.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteQuotation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quotation?"))
      return;
    try {
      await api.delete(`/quotations/${id}`);
      setSuccess("Quotation deleted successfully.");
      fetchData();
    } catch (err) {
      setError("Failed to delete quotation.");
    }
  };

  const handleOpenEmailModal = (q) => {
    setSelectedQuotation(q);
    setEmailRecipient(q.client?.email || "");
    setEmailCc("");
    setEmailSubject(
      `[Altera Interior] Quotation Proposal ${q.quotationNumber} - ${q.projectTitle}`,
    );
    setEmailMessage(
      `Dear ${q.client?.name || "Client"},\n\nPlease find attached the official interior quotation proposal for ${q.projectTitle || "your project"}.\n\nEstimated Grand Total: ${formatINR(q.pricing?.grandTotal || q.grandTotal)}.\n\nLooking forward to working with you!\n\nWarm regards,\nAltera Interior Team`,
    );
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!selectedQuotation || !emailRecipient.trim()) {
      alert("Recipient email address is required.");
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

      setSuccess(
        `Proposal email successfully dispatched to ${emailRecipient}!`,
      );
      setShowEmailModal(false);
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send email. Check recipient email or server connection.";
      setError(`Server Error (400): ${msg}`);
      alert(`Email Failed: ${msg}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConvertToProject = async (q) => {
    if (
      !window.confirm(
        `Convert Quotation ${q.quotationNumber} (${formatINR(q.pricing?.grandTotal || q.grandTotal)}) into an active project?`,
      )
    )
      return;
    setIsActionLoading(true);
    try {
      const res = await api.post(`/quotations/${q._id}/convert-to-project`);
      setSuccess(
        `Successfully converted to Project ${res.data.project?.projectId || "CRM"}!`,
      );
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not convert to project.");
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
        items: [
          {
            description: invoiceForm.description,
            quantity: 1,
            rate: amt,
            amount: amt,
          },
        ],
        subtotal: amt,
        gstRate: invoiceForm.gstRate,
        gstAmount: gstAmt,
        totalAmount: total,
        dueDate: invoiceForm.dueDate,
        paymentStatus: "Issued",
      };

      await api.post("/finance/invoices", payload);
      setSuccess("Invoice created successfully!");
      setShowInvoiceModal(false);
      fetchData();
    } catch (err) {
      setError("Failed to create invoice.");
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await api.post(
        `/finance/invoices/${selectedInvoice._id}/payments`,
        paymentForm,
      );
      setSuccess(`Payment recorded for ${selectedInvoice.invoiceNumber}!`);
      setShowPaymentModal(false);
      setSelectedInvoice(null);
    } catch (err) {
      setError("Failed to record payment.");
    }
  };

  const handleRecordQuotationPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedQuotation?._id) return;
    const amt = Number(quotationPaymentForm.amount) || 0;
    if (amt <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await api.post(
        `/quotations/${selectedQuotation._id}/transactions`,
        {
          amount: amt,
          paymentMethod: quotationPaymentForm.paymentMethod,
          referenceId: quotationPaymentForm.referenceId.trim() || undefined,
          notes: quotationPaymentForm.notes.trim() || undefined,
          status: "Completed",
        },
      );
      setSuccess(
        res.data?.message ||
          "Quotation payment recorded & synced successfully!",
      );
      setShowQuotationPaymentModal(false);
      setQuotationPaymentForm({
        amount: "",
        paymentMethod: "UPI",
        referenceId: "",
        notes: "",
      });

      const updatedQuotation = {
        ...selectedQuotation,
        paymentSummary:
          res.data?.paymentSummary || selectedQuotation.paymentSummary,
        transactions: res.data?.transactions || selectedQuotation.transactions,
      };
      setSelectedQuotation(updatedQuotation);
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to record quotation payment.";
      setError(msg);
      alert(`Error: ${msg}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <LayoutComponent title={title}>
      {/* Top Tabs */}
      <div style={styles.tabBar}>
        <button
          style={
            activeTab === "quotations" ? styles.tabBtnActive : styles.tabBtn
          }
          onClick={() => setActiveTab("quotations")}
        >
          📋 Quotations ({quotations.length})
        </button>
        <button
          style={
            activeTab === "revisions" ? styles.tabBtnActive : styles.tabBtn
          }
          onClick={() => setActiveTab("revisions")}
        >
          🔄 Revision History
        </button>
        <button
          style={activeTab === "invoices" ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab("invoices")}
        >
          🧾 Invoices &amp; Payments ({invoices.length})
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {success}
        </div>
      )}

      {/* TAB 1: QUOTATIONS */}
      {activeTab === "quotations" && (
        <div>
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div className="card" style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Total Pipeline Value</div>
                <div style={styles.kpiVal}>
                  {formatINR(summary.totalPipelineValue)}
                </div>
                <div style={styles.kpiSub}>
                  {summary.totalQuotations} Total Proposals
                </div>
              </div>
              <div className="card" style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Approved / Converted</div>
                <div style={styles.kpiVal}>
                  {formatINR(summary.approvedValue)}
                </div>
                <div style={styles.kpiSub}>
                  {summary.approvedCount + (summary.convertedCount || 0)}{" "}
                  Projects
                </div>
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

          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
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
                  <option value="Converted to Project">
                    Converted to Project
                  </option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleOpenCreateModal()}
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                ➕ Create Quotation
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filteredQuotations.length === 0 ? (
            <div
              className="card"
              style={{ padding: 40, textAlign: "center", color: "#64748b" }}
            >
              No quotations found. Click <strong>+ Create Quotation</strong> to
              generate an interior proposal.
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
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
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((q) => {
                    const grandTotal =
                      q.pricing?.grandTotal || q.grandTotal || 0;
                    return (
                      <tr key={q._id} style={styles.trRow}>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>
                          {q.quotationNumber}
                          {q.revision > 0 && (
                            <span style={styles.revBadge}>v{q.revision}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {q.client?.name || "Homeowner"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            📞 {q.client?.phone || "—"}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {q.projectTitle || "Interior Works"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            📍 {q.siteLocation || q.client?.address || "—"}
                          </div>
                        </td>
                        <td style={{ color: "#334155" }}>
                          {q.items?.length || 0} items
                        </td>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>
                          {formatINR(grandTotal)}
                        </td>
                        <td>
                          <span style={styles.badgeStatus}>
                            {q.status || "Draft"}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "#475569" }}>
                          {formatDate(q.quotationDate || q.createdAt)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "flex-end",
                            }}
                          >
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
                              style={{ ...styles.iconBtn, color: "#dc2626" }}
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

      {/* TAB 2: REVISION HISTORY */}
      {activeTab === "revisions" && (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 6,
              }}
            >
              Quotation Revision Audit Trail
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              Audit version history and scope modifications across all customer
              proposals.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {quotations.map((q) => (
              <div
                key={q._id}
                className="card"
                style={{
                  padding: 18,
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}
                  >
                    {q.quotationNumber}
                  </span>
                  <span style={styles.revBadge}>Rev {q.revision || 0}</span>
                </div>
                <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
                  <strong>Client:</strong> {q.client?.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#0f172a",
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  Total: {formatINR(q.pricing?.grandTotal || q.grandTotal)}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                  Generated: {formatDate(q.quotationDate || q.createdAt)}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    background: "#f8fafc",
                    padding: 8,
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  Scope:{" "}
                  {Array.from(new Set((q.items || []).map((i) => i.room))).join(
                    ", ",
                  ) || "General Interior"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INVOICES & PAYMENTS */}
      {activeTab === "invoices" && (
        <div>
          <div style={styles.actionHeader}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Client Invoices &amp; Receivables
            </h3>
            <button
              className="btn btn-primary"
              onClick={() => setShowInvoiceModal(true)}
            >
              ➕ New Invoice
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : invoices.length === 0 ? (
            <div
              className="card"
              style={{ padding: 40, textAlign: "center", color: "#64748b" }}
            >
              No invoices generated yet.
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
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
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        {inv.invoiceNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {inv.clientName}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {inv.projectName || "Interior Works"}
                        </div>
                      </td>
                      <td style={{ color: "#334155" }}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        {formatINR(inv.totalAmount)}
                      </td>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        {formatINR(inv.paidAmount)}
                      </td>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        {formatINR(inv.balanceAmount)}
                      </td>
                      <td>
                        <span style={styles.badgeStatus}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {inv.paymentStatus !== "Paid" && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({
                                ...paymentForm,
                                amount: inv.balanceAmount,
                              });
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

      {/* MODAL: CREATE / EDIT QUOTATION (WIZARD) */}
      {showCreateModal && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 850 }}>
            <div style={styles.modalHeader}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {editingQuotationId
                  ? "Revise Interior Quotation"
                  : "Create Interior Quotation Proposal"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  if (subRoute !== "list") navigate(basePath);
                }}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.wizardTabs}>
              {[
                { num: 1, label: "1. Client & Project" },
                { num: 2, label: "2. Scope & Room Items" },
                { num: 3, label: "3. Accessories" },
                { num: 4, label: "4. Pricing & Taxes" },
                { num: 5, label: "5. Milestones & Save" },
              ].map((s) => (
                <button
                  key={s.num}
                  style={
                    formStep === s.num
                      ? styles.wizardTabActive
                      : styles.wizardTab
                  }
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
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 10,
                    }}
                  >
                    Client Details
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
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
                      <label style={styles.label}>
                        Company Name (Optional)
                      </label>
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

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
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
                      <label style={styles.label}>
                        Client GSTIN (Optional)
                      </label>
                      <input
                        type="text"
                        value={clientGstin}
                        onChange={(e) => setClientGstin(e.target.value)}
                        style={styles.formInput}
                        placeholder="07AAAAA0000A1Z5"
                      />
                    </div>
                  </div>

                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 10,
                      marginTop: 16,
                    }}
                  >
                    Project Parameters
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                    }}
                  >
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

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 20,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setFormStep(2)}
                    >
                      Next: Add Scope Items →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: ROOMS & SCOPE ITEMS */}
              {formStep === 2 && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={styles.label}>
                      1. Select Room / Category:
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 4,
                      }}
                    >
                      {roomCategories.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleSelectRoom(r)}
                          style={
                            selectedRoom === r
                              ? styles.roomBtnActive
                              : styles.roomBtn
                          }
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {showCustomCategoryInput && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 8,
                          maxWidth: 400,
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Enter Custom Category Name"
                          value={customCategoryName}
                          onChange={(e) =>
                            setCustomCategoryName(e.target.value)
                          }
                          style={styles.formInput}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleConfirmCustomRoom}
                          style={{
                            padding: "4px 12px",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Add Category
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SUB-ITEM / ITEM NAME SELECTION */}
                  <div
                    style={{
                      marginBottom: 14,
                      background: "#ffffff",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <label
                      style={{
                        ...styles.label,
                        color: "#0f172a",
                        fontWeight: 700,
                      }}
                    >
                      2. Select Item Name for{" "}
                      <span style={{ color: "#7A131A" }}>{selectedRoom}</span>:
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 6,
                      }}
                    >
                      {(
                        subItemMap[selectedRoom] ||
                        DEFAULT_CATEGORY_SUB_ITEMS[selectedRoom] || [
                          "+ Add More",
                        ]
                      ).map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleSelectSubItem(sub)}
                          style={
                            itemName === sub
                              ? styles.subItemBtnActive
                              : sub === "+ Add More"
                                ? styles.subItemAddMoreBtn
                                : styles.subItemBtn
                          }
                        >
                          {sub}
                        </button>
                      ))}
                    </div>

                    {showCustomSubItemInput && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 10,
                          maxWidth: 500,
                        }}
                      >
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
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleConfirmCustomSubItem();
                            }
                          }}
                          style={styles.formInput}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleConfirmCustomSubItem()}
                          style={{
                            padding: "4px 14px",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          + Add Option
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Composer Card */}
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: 14,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      marginBottom: 16,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 8,
                      }}
                    >
                      Configure Details for{" "}
                      <span style={{ color: "#7A131A" }}>
                        {itemName || selectedRoom}
                      </span>
                    </h4>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <label style={styles.label}>Item Name *</label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              autoAddSubItemOption(
                                selectedRoom,
                                e.target.value.trim(),
                              );
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

                    {/* Description Option Chips */}
                    <div style={{ marginBottom: 10 }}>
                      <label
                        style={{
                          ...styles.label,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        Select Description Preset / Add Custom Option:
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 2,
                        }}
                      >
                        {descriptionOptions.map((desc) => (
                          <button
                            key={desc}
                            type="button"
                            onClick={() => handleSelectDescription(desc)}
                            style={
                              itemDesc === desc
                                ? styles.subItemBtnActive
                                : desc === "+ Add More"
                                  ? styles.subItemAddMoreBtn
                                  : styles.subItemBtn
                            }
                          >
                            {desc}
                          </button>
                        ))}
                      </div>

                      {showCustomDescriptionInput && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 8,
                            maxWidth: 450,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Type custom description option..."
                            value={customDescriptionText}
                            onChange={(e) => {
                              setCustomDescriptionText(e.target.value);
                              if (e.target.value.trim()) {
                                setItemDesc(e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleConfirmCustomDescription();
                              }
                            }}
                            style={styles.formInput}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmCustomDescription()}
                            style={{
                              padding: "4px 12px",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            + Add Option
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Unit Pills Selection */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={styles.label}>
                        Select Unit / Measurement Type:
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 2,
                        }}
                      >
                        {unitOptions.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleSelectUnit(u)}
                            style={
                              itemUnit === u
                                ? styles.subItemBtnActive
                                : u === "+ Add More"
                                  ? styles.subItemAddMoreBtn
                                  : styles.subItemBtn
                            }
                          >
                            {u}
                          </button>
                        ))}
                      </div>

                      {showCustomUnitInput && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 8,
                            maxWidth: 350,
                          }}
                        >
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
                              if (e.key === "Enter") {
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
                            style={{
                              padding: "4px 12px",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            + Add Unit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Merged Size & Rate Inputs */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 10,
                        marginBottom: 10,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <label style={styles.label}>
                          Size ({itemUnit || "Sq Ft"}) *
                        </label>
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
                      <div
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#0f172a",
                          paddingTop: 16,
                        }}
                      >
                        Amt:{" "}
                        {formatINR(
                          Math.round(
                            (parseFloat(itemSize) > 0
                              ? parseFloat(itemSize)
                              : itemRate
                                ? 1
                                : 0) * (parseFloat(itemRate) || 0),
                          ) +
                            itemAccessories.reduce(
                              (sum, a) =>
                                sum +
                                (a.cost !== undefined
                                  ? Number(a.cost)
                                  : (Number(a.qty) || 1) *
                                    (Number(a.unitPrice) || 0)),
                              0,
                            ),
                        )}
                      </div>
                    </div>

                    {/* Material Specifications */}
                    <div
                      style={{
                        marginBottom: 12,
                        background: "#ffffff",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <label
                        style={{
                          ...styles.label,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        Select Core Material:
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        {materialOptions.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSelectMaterial(m)}
                            style={
                              specCarcass === m
                                ? styles.subItemBtnActive
                                : m === "+ Add More"
                                  ? styles.subItemAddMoreBtn
                                  : styles.subItemBtn
                            }
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      {showCustomMaterialInput && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 8,
                            maxWidth: 450,
                          }}
                        >
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
                              if (e.key === "Enter") {
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
                            style={{
                              padding: "4px 12px",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            + Add Material
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Hardware Specifications */}
                    <div
                      style={{
                        marginBottom: 12,
                        background: "#ffffff",
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <label
                        style={{
                          ...styles.label,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        Select Hardware Option:
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        {hardwareOptions.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => handleSelectHardware(h)}
                            style={
                              specHardware === h
                                ? styles.subItemBtnActive
                                : h === "+ Add More"
                                  ? styles.subItemAddMoreBtn
                                  : styles.subItemBtn
                            }
                          >
                            {h}
                          </button>
                        ))}
                      </div>

                      {showCustomHardwareInput && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 8,
                            maxWidth: 450,
                          }}
                        >
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
                              if (e.key === "Enter") {
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
                            style={{
                              padding: "4px 12px",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            + Add Hardware
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Additional Specifications */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <label style={{ fontSize: 10, color: "#475569" }}>
                          Selected Material
                        </label>
                        <input
                          type="text"
                          value={specCarcass}
                          onChange={(e) => setSpecCarcass(e.target.value)}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 11,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569" }}>
                          Selected Hardware
                        </label>
                        <input
                          type="text"
                          value={specHardware}
                          onChange={(e) => setSpecHardware(e.target.value)}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 11,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569" }}>
                          Shutter
                        </label>
                        <input
                          type="text"
                          value={specShutter}
                          onChange={(e) => setSpecShutter(e.target.value)}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 11,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569" }}>
                          Finish
                        </label>
                        <input
                          type="text"
                          value={specFinish}
                          onChange={(e) => setSpecFinish(e.target.value)}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 11,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569" }}>
                          Brand
                        </label>
                        <input
                          type="text"
                          value={specBrand}
                          onChange={(e) => setSpecBrand(e.target.value)}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 11,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569" }}>
                          Thickness
                        </label>
                        <input
                          type="text"
                          value={specThickness}
                          onChange={(e) => setSpecThickness(e.target.value)}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 11,
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddItem}
                        style={{ fontSize: 12, padding: "5px 12px" }}
                      >
                        + Add Item to Scope
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <h4
                    style={{
                      margin: "10px 0",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Scope Items ({items.length})
                  </h4>
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: "auto",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: 8,
                      marginBottom: 16,
                    }}
                  >
                    {items.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          textAlign: "center",
                          padding: 12,
                        }}
                      >
                        No items added yet. Compose one above.
                      </div>
                    ) : (
                      items.map((it, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid #e2e8f0",
                            background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: "#0f172a",
                                }}
                              >
                                {it.name}
                              </span>{" "}
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  fontWeight: 600,
                                }}
                              >
                                [{it.room}]
                              </span>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#475569",
                                  marginTop: 4,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span>Size/Qty ({it.unit || "Sq Ft"}):</span>
                                <input
                                  type="number"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQty(idx, e.target.value)
                                  }
                                  style={{
                                    width: 55,
                                    padding: "2px 4px",
                                    fontSize: 11,
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 4,
                                    fontWeight: 700,
                                  }}
                                  min="0.1"
                                  step="any"
                                />
                                <span>× Rate (₹):</span>
                                <input
                                  type="number"
                                  value={it.rate}
                                  onChange={(e) =>
                                    handleUpdateItemRate(idx, e.target.value)
                                  }
                                  style={{
                                    width: 70,
                                    padding: "2px 4px",
                                    fontSize: 11,
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 4,
                                    fontWeight: 700,
                                  }}
                                  min="0"
                                  step="any"
                                />
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                  color: "#0f172a",
                                }}
                              >
                                {formatINR(
                                  Math.round(
                                    (it.quantity || 1) * (it.rate || 0),
                                  ) +
                                    (it.accessories || []).reduce((sum, a) => {
                                      if (
                                        a.name &&
                                        it.name &&
                                        a.name.trim().toLowerCase() ===
                                          it.name.trim().toLowerCase()
                                      )
                                        return sum;
                                      return (
                                        sum +
                                        (a.cost !== undefined
                                          ? Number(a.cost)
                                          : (Number(a.qty) || 1) *
                                            (Number(a.unitPrice) || 0))
                                      );
                                    }, 0),
                                )}
                              </span>
                              <button
                                type="button"
                                style={{
                                  border: "none",
                                  background: "none",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  fontSize: 14,
                                }}
                                onClick={() =>
                                  setItems(items.filter((_, i) => i !== idx))
                                }
                                title="Remove Item"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {it.accessories && it.accessories.length > 0 && (
                            <div
                              style={{
                                marginTop: 6,
                                paddingLeft: 10,
                                borderLeft: "2px solid #fda4af",
                                fontSize: 11,
                                color: "#881337",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 10.5,
                                  marginBottom: 2,
                                }}
                              >
                                Included Accessories:
                              </div>
                              {it.accessories.map((acc, aIdx) => (
                                <div
                                  key={aIdx}
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    fontSize: 10.5,
                                  }}
                                >
                                  <span>
                                    • <strong>{acc.name}</strong>
                                  </span>
                                  <span>Qty: {acc.qty}</span>
                                  <span>
                                    Unit Price: {formatINR(acc.unitPrice)}
                                  </span>
                                  <span style={{ fontWeight: 700 }}>
                                    Total: {formatINR(acc.cost)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Subtotal Banner for Step 2 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#fff5f5",
                      border: "1px solid #fecdd3",
                      padding: "10px 14px",
                      borderRadius: 8,
                      marginTop: 10,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#881337",
                      }}
                    >
                      Items Subtotal ({items.length} items):
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 16,
                        color: "#881337",
                      }}
                    >
                      {formatINR(liveCalc.sub)}
                    </span>
                  </div>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormStep(1)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setFormStep(3)}
                    >
                      Next: Accessories →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ACCESSORIES */}
              {formStep === 3 && (
                <div>
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 10,
                    }}
                  >
                    Standalone Accessories ({standaloneAccessories.length})
                  </h4>

                  {/* Form to Add / Edit Accessory */}
                  <div
                    style={{
                      background: "#ffffff",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 14,
                      }}
                    >
                      {editingAccIndex !== null
                        ? "Edit Accessory"
                        : "+ Add New Accessory"}
                    </div>

                    {/* 1. Accessory Name * */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={styles.label}>Accessory Name *</label>
                      <input
                        type="text"
                        value={accFormName}
                        onChange={(e) => setAccFormName(e.target.value)}
                        style={styles.formInput}
                        placeholder="e.g. Cutlery Tray / Magic Corner"
                      />
                    </div>

                    {/* 2. Select Accessories */}
                    <div style={{ marginBottom: 16 }}>
                      <label
                        style={{
                          ...styles.label,
                          color: "#64748b",
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Select Accessories
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          overflowX: "auto",
                          paddingBottom: "4px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {stAccessoryOptions.map((opt) => {
                          const isActive = showStAccCustomAccessory
                            ? opt === "+ Add More"
                            : accFormName === opt;
                          return (
                            <div
                              key={opt}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                backgroundColor: isActive
                                  ? "#7A131A"
                                  : "#E2E8F0",
                                color: isActive ? "#ffffff" : "#475569",
                                whiteSpace: "nowrap",
                              }}
                              onClick={() => {
                                if (opt === "+ Add More") {
                                  setShowStAccCustomAccessory(true);
                                } else {
                                  setShowStAccCustomAccessory(false);
                                  setAccFormName(opt);
                                }
                              }}
                            >
                              {opt}
                            </div>
                          );
                        })}
                        {showStAccCustomAccessory && (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              alignItems: "center",
                              marginTop: "4px",
                              width: "100%",
                            }}
                          >
                            <input
                              type="text"
                              value={stAccCustomAccessory}
                              onChange={(e) =>
                                setStAccCustomAccessory(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleConfirmCustomStAccAccessory();
                                }
                              }}
                              style={{
                                ...styles.formInput,
                                width: 220,
                                minWidth: 200,
                              }}
                              placeholder="Custom Accessory Name..."
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleConfirmCustomStAccAccessory()}
                              style={{
                                padding: "6px 12px",
                                fontSize: 12,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Hardware Name */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={styles.label}>Hardware Name</label>
                      <input
                        type="text"
                        value={accFormDesc}
                        onChange={(e) => setAccFormDesc(e.target.value)}
                        style={styles.formInput}
                        placeholder="e.g. Hettich Soft Close"
                      />
                    </div>

                    {/* 4. Select Hardware */}
                    <div style={{ marginBottom: 16 }}>
                      <label
                        style={{
                          ...styles.label,
                          color: "#64748b",
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Select Hardware
                      </label>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          overflowX: "auto",
                          paddingBottom: "4px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {stAccHardwareOptions.map((opt) => {
                          const isActive = showStAccCustomHardware
                            ? opt === "+ Add More"
                            : accFormDesc === opt;
                          return (
                            <div
                              key={opt}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                backgroundColor: isActive
                                  ? "#7A131A"
                                  : "#E2E8F0",
                                color: isActive ? "#ffffff" : "#475569",
                                whiteSpace: "nowrap",
                              }}
                              onClick={() => {
                                if (opt === "+ Add More") {
                                  setShowStAccCustomHardware(true);
                                } else {
                                  setShowStAccCustomHardware(false);
                                  setAccFormDesc(opt);
                                }
                              }}
                            >
                              {opt}
                            </div>
                          );
                        })}
                        {showStAccCustomHardware && (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              alignItems: "center",
                              marginTop: "4px",
                              width: "100%",
                            }}
                          >
                            <input
                              type="text"
                              value={stAccCustomHardware}
                              onChange={(e) =>
                                setStAccCustomHardware(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleConfirmCustomStAccHardware();
                                }
                              }}
                              style={{
                                ...styles.formInput,
                                width: 220,
                                minWidth: 200,
                              }}
                              placeholder="Custom Hardware Name..."
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleConfirmCustomStAccHardware()}
                              style={{
                                padding: "6px 12px",
                                fontSize: 12,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unit, Quantity, Price, Image & Total Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 1.5fr auto",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <label style={styles.label}>Unit</label>
                        <input
                          type="text"
                          value={accFormUnit}
                          onChange={(e) => setAccFormUnit(e.target.value)}
                          style={styles.formInput}
                          placeholder="Pcs"
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Quantity *</label>
                        <input
                          type="number"
                          value={accFormQty}
                          onChange={(e) => setAccFormQty(e.target.value)}
                          style={styles.formInput}
                          min="1"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Price (₹ per unit) *</label>
                        <input
                          type="number"
                          value={accFormPrice}
                          onChange={(e) => setAccFormPrice(e.target.value)}
                          style={styles.formInput}
                          min="0"
                          placeholder="e.g. 2500"
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Accessory Image</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAccImageUpload}
                            style={{ ...styles.formInput, padding: "4px" }}
                            title="Upload one or multiple photos"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const preselected = catalogAccessories.filter((c) =>
                                accFormImages.includes(c.image) || (accFormImage && c.image === accFormImage)
                              );
                              setModalSelectedItems(preselected);
                              setShowAccGalleryModal(true);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              padding: "6px 10px",
                              backgroundColor: "#ffffff",
                              color: "#7A131A",
                              border: "1px solid #7A131A",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              transition: "all 0.15s ease",
                            }}
                            title="Select from catalog hardware accessories (multi-select supported)"
                          >
                            <span>🖼️</span> Select Predefined Images ({catalogAccessories.length} items)
                          </button>
                        </div>
                      </div>
                      <div style={{ paddingTop: 18 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#7A131A",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Total:{" "}
                          {formatINR(
                            Math.round(
                              (parseFloat(accFormQty) || 0) *
                                (parseFloat(accFormPrice) || 0),
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const currentDisplayImages = accFormImages.length > 0
                        ? accFormImages
                        : (accFormImage ? [accFormImage] : []);
                      if (currentDisplayImages.length === 0) return null;
                      return (
                        <div
                          style={{
                            marginBottom: 14,
                            padding: "10px 12px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                              Selected Photos ({currentDisplayImages.length})
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const preselected = catalogAccessories.filter((c) =>
                                    accFormImages.includes(c.image) || (accFormImage && c.image === accFormImage)
                                  );
                                  setModalSelectedItems(preselected);
                                  setShowAccGalleryModal(true);
                                }}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#7A131A",
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #7A131A",
                                  borderRadius: 4,
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                + Add More Photos
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAccFormImage("");
                                  setAccFormImages([]);
                                  setAccFormImageId("");
                                }}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#dc2626",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "3px 6px",
                                }}
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            {currentDisplayImages.map((imgSrc, imgIdx) => {
                              const catalogItem = catalogAccessories.find((a) => a.image === imgSrc);
                              const nameHint = catalogItem?.name || `Photo #${imgIdx + 1}`;
                              return (
                                <div
                                  key={imgIdx}
                                  style={{
                                    position: "relative",
                                    width: 58,
                                    height: 58,
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    padding: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  title={nameHint}
                                >
                                  <img
                                    src={resolveAccessoryImageSrc(imgSrc)}
                                    alt={nameHint}
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "100%",
                                      objectFit: "contain",
                                      borderRadius: 4,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSingleAccFormImage(imgIdx)}
                                    style={{
                                      position: "absolute",
                                      top: -5,
                                      right: -5,
                                      width: 16,
                                      height: 16,
                                      borderRadius: "50%",
                                      backgroundColor: "#dc2626",
                                      color: "#ffffff",
                                      border: "1px solid #ffffff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      padding: 0,
                                      lineHeight: 1,
                                    }}
                                    title="Remove this photo"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => {
                                const preselected = catalogAccessories.filter((c) =>
                                  accFormImages.includes(c.image) || (accFormImage && c.image === accFormImage)
                                );
                                setModalSelectedItems(preselected);
                                setShowAccGalleryModal(true);
                              }}
                              style={{
                                width: 58,
                                height: 58,
                                borderRadius: 6,
                                border: "1px dashed #7A131A",
                                backgroundColor: "#fff5f5",
                                color: "#7A131A",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: "pointer",
                                gap: 2,
                              }}
                              title="Add more photos from catalog or custom upload"
                            >
                              <span style={{ fontSize: 14 }}>➕</span>
                              <span>Add More</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        marginTop: 8,
                      }}
                    >
                      {editingAccIndex !== null && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "5px 12px" }}
                          onClick={() => {
                            setEditingAccIndex(null);
                            setAccFormName("");
                            setAccFormDesc("");
                            setAccFormImage("");
      setAccFormImages([]);
      setAccFormImageId("");
                            setAccFormQty("1");
                            setAccFormUnit("Pcs");
                            setAccFormPrice("");
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                        onClick={handleAddOrUpdateStandaloneAccessory}
                      >
                        {editingAccIndex !== null
                          ? "Update Accessory"
                          : "+ Add Accessory"}
                      </button>
                    </div>
                  </div>

                  {/* List of Added Accessories */}
                  <div style={{ marginBottom: 16 }}>
                    {standaloneAccessories.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          textAlign: "center",
                          padding: 16,
                          border: "1px dashed #cbd5e1",
                          borderRadius: 6,
                        }}
                      >
                        No standalone accessories added yet. Add accessories
                        above to include them in the quotation.
                      </div>
                    ) : (
                      <div
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 12,
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: "#f8fafc",
                                borderBottom: "1px solid #cbd5e1",
                              }}
                            >
                              <th
                                style={{
                                  padding: "8px",
                                  textAlign: "center",
                                  width: "8%",
                                }}
                              >
                                Image
                              </th>
                              <th style={{ padding: "8px", textAlign: "left" }}>
                                Name &amp; Description
                              </th>
                              <th
                                style={{
                                  padding: "8px",
                                  textAlign: "center",
                                  width: "10%",
                                }}
                              >
                                Qty
                              </th>
                              <th
                                style={{
                                  padding: "8px",
                                  textAlign: "center",
                                  width: "10%",
                                }}
                              >
                                Unit
                              </th>
                              <th
                                style={{
                                  padding: "8px",
                                  textAlign: "right",
                                  width: "14%",
                                }}
                              >
                                Price
                              </th>
                              <th
                                style={{
                                  padding: "8px",
                                  textAlign: "right",
                                  width: "16%",
                                }}
                              >
                                Total
                              </th>
                              <th
                                style={{
                                  padding: "8px",
                                  textAlign: "center",
                                  width: "12%",
                                }}
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {standaloneAccessories.map((acc, idx) => (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: "1px solid #e2e8f0",
                                  background:
                                    idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "6px",
                                    textAlign: "center",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {(() => {
                                    const imgs = Array.isArray(acc.images) && acc.images.length > 0
                                      ? acc.images
                                      : (acc.image ? [acc.image] : []);
                                    if (imgs.length === 0) {
                                      return (
                                        <span
                                          style={{
                                            fontSize: 10,
                                            color: "#94a3b8",
                                            fontStyle: "italic",
                                          }}
                                        >
                                          No Image
                                        </span>
                                      );
                                    }
                                    return (
                                      <div style={{ position: "relative", display: "inline-block" }}>
                                        <img
                                          src={resolveAccessoryImageSrc(imgs[0])}
                                          alt={acc.name}
                                          style={{
                                            width: 40,
                                            height: 40,
                                            objectFit: "contain",
                                            borderRadius: 4,
                                            border: "1px solid #cbd5e1",
                                            backgroundColor: "#ffffff",
                                            display: "inline-block",
                                          }}
                                        />
                                        {imgs.length > 1 && (
                                          <span
                                            style={{
                                              position: "absolute",
                                              bottom: -2,
                                              right: -2,
                                              backgroundColor: "#7A131A",
                                              color: "#ffffff",
                                              fontSize: 9,
                                              fontWeight: 700,
                                              borderRadius: 8,
                                              padding: "1px 4px",
                                              lineHeight: 1.1,
                                            }}
                                            title={`${imgs.length} photos selected`}
                                          >
                                            +{imgs.length - 1}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      color: "#0f172a",
                                    }}
                                  >
                                    {acc.name}
                                  </div>
                                  {acc.description && (
                                    <div
                                      style={{ fontSize: 11, color: "#64748b" }}
                                    >
                                      {acc.description}
                                    </div>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "6px",
                                    textAlign: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {acc.quantity}
                                </td>
                                <td
                                  style={{
                                    padding: "6px",
                                    textAlign: "center",
                                  }}
                                >
                                  {acc.unit || "Pcs"}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatINR(acc.price)}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 8px",
                                    textAlign: "right",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                  }}
                                >
                                  {formatINR(
                                    acc.total || acc.quantity * acc.price,
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "6px",
                                    textAlign: "center",
                                  }}
                                >
                                  <button
                                    type="button"
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#7A131A",
                                      cursor: "pointer",
                                      marginRight: 8,
                                      fontWeight: 600,
                                    }}
                                    onClick={() =>
                                      handleEditStandaloneAccessory(idx)
                                    }
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#dc2626",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                    onClick={() =>
                                      handleDeleteStandaloneAccessory(idx)
                                    }
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Accessories Subtotal Banner */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "10px 14px",
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#166534",
                      }}
                    >
                      Accessories Subtotal ({standaloneAccessories.length}{" "}
                      items):
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 16,
                        color: "#166534",
                      }}
                    >
                      {formatINR(liveCalc.standaloneAccSubtotal)}
                    </span>
                  </div>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormStep(2)}
                    >
                      ← Back to Scope
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setFormStep(4)}
                    >
                      Next: Pricing &amp; Taxes →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: PRICING & TAXES */}
              {formStep === 4 && (
                <div>
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 10,
                    }}
                  >
                    Design, Handling &amp; Transportation Charges
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label style={styles.label}>Design Fees (%)</label>
                      <input
                        type="number"
                        value={designPercent}
                        onChange={(e) => setDesignPercent(e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Handling Fees (%)</label>
                      <input
                        type="number"
                        value={handlingPercent}
                        onChange={(e) => setHandlingPercent(e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          ...styles.label,
                          color: "#0f172a",
                          fontWeight: 700,
                        }}
                      >
                        Transportation Charges (Fixed ₹) *
                      </label>
                      <input
                        type="number"
                        value={transportCharges}
                        onChange={(e) => setTransportCharges(e.target.value)}
                        style={{
                          ...styles.formInput,
                          borderColor: "#7A131A",
                          fontWeight: 700,
                        }}
                        placeholder="e.g. 5000"
                        min="0"
                      />
                    </div>
                  </div>

                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 10,
                    }}
                  >
                    Special Discounts &amp; Deductions
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label style={styles.label}>Discount Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        style={styles.formInput}
                      >
                        <option value="PERCENT">% Percentage</option>
                        <option value="FIXED">₹ Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Discount Value</label>
                      <input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 10,
                    }}
                  >
                    GST Configuration &amp; Tax Options
                  </h4>

                  <div
                    style={{
                      marginBottom: 16,
                      background: "#ffffff",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <label
                      style={{
                        ...styles.label,
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 8,
                      }}
                    >
                      Apply GST Tax on Proposal?
                    </label>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setGstPercent("18");
                          setGstType("AS_PER_ACTUAL");
                        }}
                        style={
                          gstType === "AS_PER_ACTUAL"
                            ? styles.subItemBtnActive
                            : styles.subItemBtn
                        }
                      >
                        18% (As per actuals)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGstPercent("18");
                          setGstType("CGST_SGST");
                        }}
                        style={
                          gstType !== "AS_PER_ACTUAL" &&
                          parseFloat(gstPercent) === 18
                            ? styles.subItemBtnActive
                            : styles.subItemBtn
                        }
                      >
                        GST 18% (Calculated in total)
                      </button>

                      {[5, 12, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setGstPercent(String(rate));
                            if (gstType === "AS_PER_ACTUAL")
                              setGstType("CGST_SGST");
                          }}
                          style={
                            gstType !== "AS_PER_ACTUAL" &&
                            parseFloat(gstPercent) === rate
                              ? styles.subItemBtnActive
                              : styles.subItemBtn
                          }
                        >
                          GST {rate}%
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginTop: 10,
                      }}
                    >
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
                        <select
                          value={gstType}
                          onChange={(e) => setGstType(e.target.value)}
                          style={styles.formInput}
                        >
                          <option value="AS_PER_ACTUAL">
                            As per actuals (18% Extra / Not calculated in total)
                          </option>
                          <option value="CGST_SGST">
                            CGST + SGST (Intrastate - Calculated)
                          </option>
                          <option value="IGST">
                            IGST (Interstate - Calculated)
                          </option>
                        </select>
                      </div>
                    </div>

                    {gstType === "AS_PER_ACTUAL" ? (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: "#7A131A",
                          fontWeight: 600,
                          background: "#eff6ff",
                          padding: "8px 12px",
                          borderRadius: 6,
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        ℹ️ GST 18% will be charged as per actuals and is not
                        included in the estimated total.
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: "#7A131A",
                          fontWeight: 600,
                          background: "#ecfdf5",
                          padding: "8px 12px",
                          borderRadius: 6,
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        ✓ GST {gstPercent}% is calculated and included in the
                        estimated total.
                      </div>
                    )}
                  </div>

                  {/* Live Computed Card */}
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: 14,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      marginBottom: 16,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 8,
                      }}
                    >
                      Live Financial Summary
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <div>
                        Subtotal: <strong>{formatINR(liveCalc.sub)}</strong>
                      </div>
                      <div>
                        Design Fees ({designPercent}%):{" "}
                        <strong>{formatINR(liveCalc.designFee)}</strong>
                      </div>
                      <div>
                        Handling Fees ({handlingPercent}%):{" "}
                        <strong>{formatINR(liveCalc.handlingFee)}</strong>
                      </div>
                      <div>
                        Transportation Charges:{" "}
                        <strong>{formatINR(liveCalc.transportAmt)}</strong>
                      </div>
                      <div>
                        Discount:{" "}
                        <strong style={{ color: "#7A131A" }}>
                          -{formatINR(liveCalc.discountAmt)}
                        </strong>
                      </div>
                      <div>
                        Taxable Total:{" "}
                        <strong>{formatINR(liveCalc.taxable)}</strong>
                      </div>
                      <div>
                        GST / Taxes ({gstPercent}%{" "}
                        {gstType === "AS_PER_ACTUAL" ? "– As per Actuals" : ""}
                        ):{" "}
                        <strong>
                          {gstType === "AS_PER_ACTUAL"
                            ? "18% – As per Actuals"
                            : formatINR(liveCalc.gstAmt)}
                        </strong>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0f172a",
                        marginTop: 10,
                        borderTop: "1px solid #cbd5e1",
                        paddingTop: 8,
                      }}
                    >
                      Grand Total: {formatINR(liveCalc.grandTotal)}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormStep(3)}
                    >
                      ← Back to Accessories
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setFormStep(5)}
                    >
                      Next: Milestones &amp; Save →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: MILESTONES & SAVE */}
              {formStep === 5 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      Payment Milestones Schedule
                    </h4>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: liveCalc.isMilestoneValid
                          ? "#7A131A"
                          : "#dc2626",
                      }}
                    >
                      Total Share: {liveCalc.totalMilestonePct}%{" "}
                      {liveCalc.isMilestoneValid
                        ? "✓ Valid (100%)"
                        : "⚠️ Must equal 100%"}
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: 200,
                      overflowY: "auto",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: 8,
                      marginBottom: 16,
                    }}
                  >
                    {milestones.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px 1fr",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <input
                          type="text"
                          value={m.milestoneName}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].milestoneName = e.target.value;
                            setMilestones(updated);
                          }}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 12,
                          }}
                        />
                        <input
                          type="number"
                          value={m.percentage}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].percentage =
                              Number(e.target.value) || 0;
                            setMilestones(updated);
                          }}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 12,
                            textAlign: "center",
                          }}
                        />
                        <input
                          type="text"
                          value={m.stage || ""}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].stage = e.target.value;
                            setMilestones(updated);
                          }}
                          style={{
                            ...styles.formInput,
                            padding: "4px 6px",
                            fontSize: 12,
                          }}
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
                      style={{ ...styles.formInput, resize: "vertical" }}
                      placeholder="Special customer remarks or scope details..."
                    />
                  </div>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormStep(4)}
                    >
                      ← Back to Pricing
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isActionLoading}
                    >
                      {isActionLoading
                        ? "Saving..."
                        : "✓ Save & Generate Quotation"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW QUOTATION DETAILS */}
      {showDetailModal && selectedQuotation && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 750 }}>
            <div style={styles.modalHeader}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Quotation {selectedQuotation.quotationNumber}
                </h3>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {selectedQuotation.projectTitle}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  if (subRoute !== "list") navigate(basePath);
                }}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div style={{ margin: "16px 0" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Client Information
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#0f172a",
                      marginTop: 4,
                    }}
                  >
                    {selectedQuotation.client?.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    📞 {selectedQuotation.client?.phone || "—"} | ✉️{" "}
                    {selectedQuotation.client?.email || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                    📍{" "}
                    {selectedQuotation.siteLocation ||
                      selectedQuotation.client?.address ||
                      "—"}
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Proposal Financials
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#0f172a",
                      marginTop: 4,
                    }}
                  >
                    {formatINR(
                      selectedQuotation.pricing?.grandTotal ||
                        selectedQuotation.grandTotal,
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    Subtotal:{" "}
                    {formatINR(
                      selectedQuotation.pricing?.subtotal ||
                        selectedQuotation.subtotal,
                    )}{" "}
                    | Design:{" "}
                    {formatINR(selectedQuotation.pricing?.designFeeAmount || 0)}{" "}
                    | Handling:{" "}
                    {formatINR(
                      selectedQuotation.pricing?.handlingFeeAmount || 0,
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>
                    Transport:{" "}
                    <strong>
                      {formatINR(
                        selectedQuotation.pricing?.transportCharges || 0,
                      )}
                    </strong>
                    {selectedQuotation.pricing?.discountAmount
                      ? ` | Discount: -${formatINR(selectedQuotation.pricing.discountAmount)}`
                      : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    Status: <strong>{selectedQuotation.status}</strong>
                  </div>
                </div>
              </div>

              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                Scope Items ({selectedQuotation.items?.length || 0})
              </h4>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: 8,
                  marginBottom: 16,
                }}
              >
                {(selectedQuotation.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#0f172a",
                        }}
                      >
                        {it.name}{" "}
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          [{it.room}]
                        </span>
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#0f172a",
                        }}
                      >
                        {formatINR(it.amount)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>
                      {it.quantity} {it.unit} @ {formatINR(it.rate)}
                      {it.measurements?.calculatedArea
                        ? ` (Area: ${it.measurements.calculatedArea} ${it.unit})`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>

              {/* Standalone Accessories in Detail Modal */}
              {selectedQuotation.standaloneAccessories &&
                selectedQuotation.standaloneAccessories.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0f172a",
                        marginBottom: 8,
                      }}
                    >
                      Accessories (
                      {selectedQuotation.standaloneAccessories.length})
                    </h4>
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        padding: 8,
                        marginBottom: 16,
                      }}
                    >
                      {selectedQuotation.standaloneAccessories.map(
                        (acc, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              {(() => {
                                const imgs = Array.isArray(acc.images) && acc.images.length > 0
                                  ? acc.images
                                  : (acc.image ? [acc.image] : []);
                                if (imgs.length === 0) {
                                  return (
                                    <div
                                      style={{
                                        width: 40,
                                        height: 40,
                                        background: "#f1f5f9",
                                        borderRadius: 4,
                                        border: "1px solid #cbd5e1",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 9,
                                        color: "#94a3b8",
                                      }}
                                    >
                                      No Image
                                    </div>
                                  );
                                }
                                return (
                                  <div style={{ position: "relative", display: "inline-block" }}>
                                    <img
                                      src={resolveAccessoryImageSrc(imgs[0])}
                                      alt={acc.name}
                                      style={{
                                        width: 40,
                                        height: 40,
                                        objectFit: "contain",
                                        borderRadius: 4,
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: "#ffffff",
                                        display: "inline-block",
                                      }}
                                    />
                                    {imgs.length > 1 && (
                                      <span
                                        style={{
                                          position: "absolute",
                                          bottom: -2,
                                          right: -2,
                                          backgroundColor: "#7A131A",
                                          color: "#ffffff",
                                          fontSize: 9,
                                          fontWeight: 700,
                                          borderRadius: 8,
                                          padding: "1px 4px",
                                          lineHeight: 1.1,
                                        }}
                                        title={`${imgs.length} photos selected`}
                                      >
                                        +{imgs.length - 1}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 13,
                                    color: "#0f172a",
                                  }}
                                >
                                  {acc.name}
                                </div>
                                {acc.description && (
                                  <div
                                    style={{ fontSize: 11, color: "#64748b" }}
                                  >
                                    {acc.description}
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: "#475569" }}>
                                  Qty: {acc.quantity} {acc.unit || "Pcs"} @{" "}
                                  {formatINR(acc.price)}
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: "#0f172a",
                              }}
                            >
                              {formatINR(acc.total || acc.quantity * acc.price)}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Payment & Transaction Summary Box */}
              <div
                style={{
                  background: "#fff1f2",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #fecdd3",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7a131a",
                      textTransform: "uppercase",
                    }}
                  >
                    Payment &amp; Transaction Summary
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background:
                        selectedQuotation.paymentSummary?.paymentStatus ===
                        "PAID"
                          ? "#d1fae5"
                          : selectedQuotation.paymentSummary?.paymentStatus ===
                              "PARTIALLY_PAID"
                            ? "#fef3c7"
                            : "#fee2e2",
                      color:
                        selectedQuotation.paymentSummary?.paymentStatus ===
                        "PAID"
                          ? "#065f46"
                          : selectedQuotation.paymentSummary?.paymentStatus ===
                              "PARTIALLY_PAID"
                            ? "#92400e"
                            : "#991b1b",
                    }}
                  >
                    {(
                      selectedQuotation.paymentSummary?.paymentStatus ||
                      "UNPAID"
                    ).replace("_", " ")}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    Total:{" "}
                    <strong>
                      {formatINR(
                        selectedQuotation.paymentSummary?.totalAmount ||
                          selectedQuotation.pricing?.grandTotal ||
                          selectedQuotation.grandTotal,
                      )}
                    </strong>
                  </div>
                  <div style={{ color: "#7A131A" }}>
                    Paid:{" "}
                    <strong>
                      {formatINR(
                        selectedQuotation.paymentSummary?.paidAmount || 0,
                      )}
                    </strong>
                  </div>
                  <div style={{ color: "#dc2626" }}>
                    Balance:{" "}
                    <strong>
                      {formatINR(
                        selectedQuotation.paymentSummary?.remainingAmount ??
                          (selectedQuotation.pricing?.grandTotal ||
                            selectedQuotation.grandTotal ||
                            0),
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#7a131a",
                    borderColor: "#7a131a",
                    padding: "6px 12px",
                  }}
                  onClick={() => {
                    setQuotationPaymentForm({
                      amount:
                        selectedQuotation.paymentSummary?.remainingAmount ||
                        selectedQuotation.pricing?.grandTotal ||
                        "",
                      paymentMethod: "UPI",
                      referenceId: "",
                      notes: "",
                    });
                    setShowQuotationPaymentModal(true);
                  }}
                >
                  💳 Record Quotation Payment / Transaction
                </button>

                {selectedQuotation.transactions &&
                  selectedQuotation.transactions.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        borderTop: "1px solid #fecdd3",
                        paddingTop: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#7a131a",
                          marginBottom: 4,
                        }}
                      >
                        Transaction History (
                        {selectedQuotation.transactions.length})
                      </div>
                      <div style={{ maxHeight: 120, overflowY: "auto" }}>
                        {selectedQuotation.transactions.map((tx, idx) => (
                          <div
                            key={tx._id || idx}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: 4,
                              padding: 6,
                              marginBottom: 4,
                              fontSize: 11,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontWeight: 700,
                              }}
                            >
                              <span>
                                {tx.transactionId ||
                                  tx.referenceId ||
                                  `TXN-${idx + 1}`}
                              </span>
                              <span style={{ color: "#7A131A" }}>
                                {formatINR(tx.amount)}
                              </span>
                            </div>
                            <div style={{ color: "#64748b", fontSize: 10 }}>
                              {tx.paymentMethod || "UPI"} •{" "}
                              {formatDate(tx.transactionDate || tx.createdAt)} •{" "}
                              {tx.status || "Completed"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => printQuotation(selectedQuotation)}
                >
                  📄 Print / PDF
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenEmailModal(selectedQuotation);
                  }}
                >
                  ✉️ Email Client
                </button>
                {selectedQuotation.status !== "Converted to Project" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleConvertToProject(selectedQuotation)}
                    disabled={isActionLoading}
                  >
                    🚀 Convert to Project
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMAIL DISPATCH */}
      {showEmailModal && selectedQuotation && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Email Quotation PDF
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleSendEmail}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 16,
              }}
            >
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
                  style={{ ...styles.formInput, resize: "vertical" }}
                />
              </div>
              <div
                style={{
                  background: "#f8fafc",
                  padding: 10,
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                }}
              >
                📎 Attached:{" "}
                <strong>
                  Quotation_{selectedQuotation.quotationNumber}.pdf
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEmailModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isActionLoading}
                >
                  {isActionLoading
                    ? "Dispatching..."
                    : "Send Proposal Email ✉️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE INVOICE */}
      {showInvoiceModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Create New Invoice
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleCreateInvoice}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 16,
              }}
            >
              <div>
                <label style={styles.label}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={invoiceForm.clientName}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      clientName: e.target.value,
                    })
                  }
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Project Name / Site</label>
                <input
                  type="text"
                  value={invoiceForm.projectName}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      projectName: e.target.value,
                    })
                  }
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Milestone / Billing Item</label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      description: e.target.value,
                    })
                  }
                  style={styles.formInput}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={styles.label}>Amount Before GST (₹)</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.amount}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        amount: Number(e.target.value),
                      })
                    }
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        dueDate: e.target.value,
                      })
                    }
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInvoiceModal(false)}
                >
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

      {/* MODAL: RECORD PAYMENT */}
      {showPaymentModal && selectedInvoice && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Record Payment for {selectedInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleRecordPayment}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  background: "#f1f5f9",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ color: "#0f172a" }}>
                  Client: <strong>{selectedInvoice.clientName}</strong>
                </div>
                <div style={{ color: "#0f172a" }}>
                  Total Invoice:{" "}
                  <strong>{formatINR(selectedInvoice.totalAmount)}</strong>
                </div>
                <div style={{ color: "#0f172a" }}>
                  Outstanding:{" "}
                  <strong>{formatINR(selectedInvoice.balanceAmount)}</strong>
                </div>
              </div>

              <div>
                <label style={styles.label}>Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: Number(e.target.value),
                    })
                  }
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.label}>Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value })
                  }
                  style={styles.formInput}
                >
                  <option value="Bank Transfer (NEFT/RTGS)">
                    Bank Transfer (NEFT/RTGS)
                  </option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
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

      {/* MODAL: RECORD QUOTATION PAYMENT */}
      {showQuotationPaymentModal && selectedQuotation && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Record Payment for #{selectedQuotation.quotationNumber}
              </h3>
              <button
                onClick={() => setShowQuotationPaymentModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleRecordQuotationPayment}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  background: "#f8fafc",
                  padding: 10,
                  borderRadius: 6,
                  fontSize: 12,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  Client: <strong>{selectedQuotation.client?.name}</strong>
                </div>
                <div>
                  Quotation Total:{" "}
                  <strong>
                    {formatINR(
                      selectedQuotation.paymentSummary?.totalAmount ||
                        selectedQuotation.pricing?.grandTotal ||
                        selectedQuotation.grandTotal,
                    )}
                  </strong>
                </div>
                <div>
                  Remaining Balance:{" "}
                  <strong style={{ color: "#dc2626" }}>
                    {formatINR(
                      selectedQuotation.paymentSummary?.remainingAmount ??
                        (selectedQuotation.pricing?.grandTotal ||
                          selectedQuotation.grandTotal ||
                          0),
                    )}
                  </strong>
                </div>
              </div>

              <div>
                <label style={styles.label}>Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  value={quotationPaymentForm.amount}
                  onChange={(e) =>
                    setQuotationPaymentForm({
                      ...quotationPaymentForm,
                      amount: e.target.value,
                    })
                  }
                  style={styles.formInput}
                />
              </div>

              <div>
                <label style={styles.label}>Payment Method *</label>
                <select
                  value={quotationPaymentForm.paymentMethod}
                  onChange={(e) =>
                    setQuotationPaymentForm({
                      ...quotationPaymentForm,
                      paymentMethod: e.target.value,
                    })
                  }
                  style={styles.formInput}
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">
                    Bank Transfer (NEFT/RTGS)
                  </option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Credit/Debit Card</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  Reference / Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque No"
                  value={quotationPaymentForm.referenceId}
                  onChange={(e) =>
                    setQuotationPaymentForm({
                      ...quotationPaymentForm,
                      referenceId: e.target.value,
                    })
                  }
                  style={styles.formInput}
                />
              </div>

              <div>
                <label style={styles.label}>Notes / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 10% booking token received"
                  value={quotationPaymentForm.notes}
                  onChange={(e) =>
                    setQuotationPaymentForm({
                      ...quotationPaymentForm,
                      notes: e.target.value,
                    })
                  }
                  style={{ ...styles.formInput, resize: "vertical" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQuotationPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: "#7A131A", borderColor: "#7A131A" }}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? "Saving..." : "✓ Save & Sync Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREDEFINED HARDWARE ACCESSORIES GALLERY */}
      {showAccGalleryModal && (
        <div
          style={{
            ...styles.modalBackdrop,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAccGalleryModal(false);
            }
          }}
        >
          <div
            style={{
              ...styles.modalCard,
              maxWidth: 880,
              width: "95%",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              padding: 20,
            }}
          >
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Select Hardware Accessory Image
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  Select one or multiple photos from the catalog ({catalogAccessories.length} items), or click "+ Add More" to upload custom hardware.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAccGalleryModal(false)}
                style={styles.closeBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {/* Search input */}
              <div style={{ flex: "1 1 240px", position: "relative" }}>
                <input
                  type="text"
                  placeholder="🔍 Search accessories (e.g. Lift Basket, Magic Corner...)"
                  value={accGallerySearch}
                  onChange={(e) => setAccGallerySearch(e.target.value)}
                  style={{
                    ...styles.formInput,
                    paddingRight: accGallerySearch ? 30 : 12,
                    fontSize: 12,
                  }}
                />
                {accGallerySearch && (
                  <button
                    type="button"
                    onClick={() => setAccGallerySearch("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 2,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filters + Add More Button */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {["All", "Kitchen Accessories", "Wardrobe Accessories"].map((cat) => {
                  const isActive = accGalleryCategory === cat;
                  const count =
                    cat === "All"
                      ? catalogAccessories.length
                      : catalogAccessories.filter((a) => a.category === cat).length;
                  const label =
                    cat === "All"
                      ? `All (${count})`
                      : cat === "Kitchen Accessories"
                      ? `Kitchen (${count})`
                      : `Wardrobe (${count})`;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setAccGalleryCategory(cat);
                        setShowAddCustomModalItem(false);
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: isActive ? "#7A131A" : "#cbd5e1",
                        backgroundColor: isActive ? "#7A131A" : "#f8fafc",
                        color: isActive ? "#ffffff" : "#475569",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}

                {/* + Add More category pill */}
                <button
                  type="button"
                  onClick={() => setShowAddCustomModalItem((v) => !v)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: showAddCustomModalItem ? "1px solid #7A131A" : "1px dashed #7A131A",
                    backgroundColor: showAddCustomModalItem ? "#7A131A" : "#fff5f5",
                    color: showAddCustomModalItem ? "#ffffff" : "#7A131A",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                  }}
                  title="Upload and add more hardware accessories"
                >
                  <span>➕</span>
                  <span>Add More</span>
                </button>

                {modalSelectedItems.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7A131A",
                      backgroundColor: "#fee2e2",
                      padding: "4px 8px",
                      borderRadius: 12,
                    }}
                  >
                    {modalSelectedItems.length} selected
                  </span>
                )}
              </div>
            </div>

            {/* Inline Custom Accessory Form (+ Add More) */}
            {showAddCustomModalItem && (
              <div
                style={{
                  margin: "12px 0",
                  padding: 14,
                  backgroundColor: "#fff5f5",
                  border: "1px solid #fecdd3",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#7A131A" }}>
                    ➕ Add More Hardware Accessory to Catalog
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModalItem(false)}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13 }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 2 }}>
                      Accessory Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cutlery Organizer, Pantry Basket"
                      value={customModalItemName}
                      onChange={(e) => setCustomModalItemName(e.target.value)}
                      style={{ ...styles.formInput, fontSize: 12, padding: "5px 8px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 2 }}>
                      Category
                    </label>
                    <select
                      value={customModalItemCategory}
                      onChange={(e) => setCustomModalItemCategory(e.target.value)}
                      style={{ ...styles.formInput, fontSize: 12, padding: "5px 8px" }}
                    >
                      <option value="Kitchen Accessories">Kitchen Accessories</option>
                      <option value="Wardrobe Accessories">Wardrobe Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#334155", display: "block", marginBottom: 2 }}>
                      Accessory Photo *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomModalItemUpload}
                      style={{ ...styles.formInput, fontSize: 11, padding: "3px" }}
                    />
                  </div>
                  <div style={{ paddingTop: 16 }}>
                    <button
                      type="button"
                      onClick={handleSaveCustomModalItem}
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: "#7A131A",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✓ Save &amp; Select
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Gallery Grid */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px 2px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
                maxHeight: "55vh",
              }}
            >
              {/* "+ Add More" interactive card in grid when form is closed */}
              {!showAddCustomModalItem && (
                <div
                  onClick={() => setShowAddCustomModalItem(true)}
                  style={{
                    border: "2px dashed #7A131A",
                    borderRadius: 8,
                    backgroundColor: "#fffafa",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                    minHeight: 180,
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fee2e2";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fffafa";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  title="Click to add more custom hardware accessories"
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      backgroundColor: "#fee2e2",
                      color: "#7A131A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    ➕
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#7A131A" }}>
                    + Add More
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Upload custom hardware or photos
                  </div>
                </div>
              )}

              {filteredPredefinedAccessories.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "30px 20px",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  No accessories match "{accGallerySearch}".
                </div>
              ) : (
                filteredPredefinedAccessories.map((item) => {
                  const isSelected = modalSelectedItems.some(
                    (it) => it.id === item.id || it.image === item.image
                  );
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleModalItemSelect(item)}
                      style={{
                        position: "relative",
                        border: isSelected
                          ? "2px solid #7A131A"
                          : "1px solid #e2e8f0",
                        borderRadius: 8,
                        backgroundColor: isSelected ? "#fff5f5" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected
                          ? "0 4px 6px -1px rgba(122, 19, 26, 0.2)"
                          : "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#94a3b8";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      {/* Selection Checkmark Badge on Top-Right */}
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: isSelected ? "#7A131A" : "rgba(255,255,255,0.9)",
                          border: isSelected ? "2px solid #7A131A" : "2px solid #cbd5e1",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          zIndex: 2,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        }}
                      >
                        {isSelected ? "✓" : ""}
                      </div>

                      {/* Image Thumbnail Container */}
                      <div
                        style={{
                          height: 110,
                          backgroundColor: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 8,
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{
                            maxHeight: "100%",
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                          loading="lazy"
                        />
                      </div>

                      {/* Content */}
                      <div
                        style={{
                          padding: "10px",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 6,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isSelected ? "#7A131A" : "#1e293b",
                              lineHeight: 1.3,
                              marginBottom: 2,
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#64748b",
                            }}
                          >
                            {item.category}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleModalItemSelect(item);
                          }}
                          style={{
                            width: "100%",
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 4,
                            cursor: "pointer",
                            border: isSelected
                              ? "1px solid #7A131A"
                              : "1px solid #cbd5e1",
                            backgroundColor: isSelected ? "#7A131A" : "#ffffff",
                            color: isSelected ? "#ffffff" : "#334155",
                            marginTop: 4,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSelected ? "✓ Selected" : "Select Photo"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer with Multi-Select Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                paddingTop: 12,
                marginTop: 8,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b" }}>
                💡 Select multiple photos at once. Click <strong>Apply Selection</strong> to attach them to your item.
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {modalSelectedItems.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setModalSelectedItems([])}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      Clear Selection
                    </button>
                    {modalSelectedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={handleBatchAddModalItems}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: "1px solid #7A131A",
                          backgroundColor: "#ffffff",
                          color: "#7A131A",
                          cursor: "pointer",
                        }}
                        title="Add each selected accessory as a separate row in the quotation"
                      >
                        ➕ Add All as Separate Items ({modalSelectedItems.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyModalSelection}
                      style={{
                        padding: "6px 16px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: "none",
                        backgroundColor: "#7A131A",
                        color: "#ffffff",
                        cursor: "pointer",
                        boxShadow: "0 1px 2px rgba(122, 19, 26, 0.3)",
                      }}
                    >
                      ✓ Apply Selection ({modalSelectedItems.length} photos)
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowAccGalleryModal(false)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutComponent>
  );
}

const styles = {
  tabBar: {
    display: "flex",
    gap: 8,
    borderBottom: "1px solid #cbd5e1",
    paddingBottom: 12,
    marginBottom: 20,
    overflowX: "auto",
  },
  tabBtn: {
    padding: "8px 16px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: "#475569",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabBtnActive: {
    padding: "8px 16px",
    background: "#0f172a",
    border: "1px solid #0f172a",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  kpiCard: {
    padding: 14,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  searchInput: {
    padding: "8px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    minWidth: 220,
    color: "#0f172a",
  },
  selectInput: {
    padding: "8px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    color: "#0f172a",
    background: "#ffffff",
  },
  actionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "2px solid #cbd5e1",
    background: "#f8fafc",
    fontSize: 12,
    color: "#475569",
    textTransform: "uppercase",
  },
  trRow: {
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
  },
  revBadge: {
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "2px 6px",
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 6,
    border: "1px solid #cbd5e1",
  },
  badgeStatus: {
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "3px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid #cbd5e1",
  },
  iconBtn: {
    padding: "4px 8px",
    fontSize: 12,
  },
  wizardTabs: {
    display: "flex",
    gap: 6,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 10,
    marginBottom: 14,
    overflowX: "auto",
  },
  wizardTab: {
    padding: "6px 12px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  wizardTabActive: {
    padding: "6px 12px",
    background: "#7a131a",
    border: "1px solid #7a131a",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  roomBtn: {
    padding: "4px 10px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
    cursor: "pointer",
  },
  roomBtnActive: {
    padding: "4px 10px",
    background: "#7a131a",
    border: "1px solid #7a131a",
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    cursor: "pointer",
  },
  subItemBtn: {
    padding: "5px 12px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  subItemBtnActive: {
    padding: "5px 12px",
    background: "#7a131a",
    border: "1px solid #7a131a",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(122, 19, 26, 0.3)",
  },
  subItemAddMoreBtn: {
    padding: "5px 12px",
    background: "#fff5f5",
    border: "1px dashed #7a131a",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#7a131a",
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16,
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: 12,
    maxWidth: 580,
    width: "100%",
    padding: 24,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 12,
  },
  closeBtn: {
    border: "none",
    background: "none",
    fontSize: 18,
    color: "#64748b",
    cursor: "pointer",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    marginBottom: 4,
  },
  formInput: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
  },
};

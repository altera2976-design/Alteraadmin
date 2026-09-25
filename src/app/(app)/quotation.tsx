import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import {
  quotationApi,
  QuotationDoc,
  QuotationItemDoc,
  QuotationMilestone,
  QuotationSummaryKpis,
} from "../../services/quotationApi";
import {
  downloadPdf,
  generatePdf,
  sharePdf,
} from "../../services/quotationPdf";

const { width } = Dimensions.get("window");

function formatINR(amount: number | undefined): string {
  if (amount === undefined || isNaN(amount)) return "₹0";
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

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

const DEFAULT_CATEGORY_SUB_ITEMS: Record<string, string[]> = {
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

const DEFAULT_ACCESSORY_OPTIONS = [
  "Wicker Basket",
  "BPO (Bottle Pull Out)",
  "Innotech Drawers",
  "Tandem Box",
  "Corner Carousel",
  "Cutlery Tray",
  "+ Add More",
];

const DEFAULT_DESCRIPTION_OPTIONS = [
  "HDHMR Carcass with High Gloss Acrylic",
  "BWP Ply Carcass with PU Finish",
  "Laminate Finish with Soft-Close Fittings",
  "Modular Factory Finish with Hardware",
  "Standard Factory Specifications",
  "+ Add More",
];

const DEFAULT_MILESTONES_INPUT: QuotationMilestone[] = [
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

export default function QuotationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // ── State ──────────────────────────────────────────────────────────────────
  const [quotations, setQuotations] = useState<QuotationDoc[]>([]);
  const [summary, setSummary] = useState<QuotationSummaryKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationDoc | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Email form
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Quotation Transaction Modal State
  const [isAddTxnModalOpen, setIsAddTxnModalOpen] = useState(false);
  const [txnAmount, setTxnAmount] = useState("");
  const [txnPaymentMethod, setTxnPaymentMethod] = useState("UPI");
  const [txnReferenceId, setTxnReferenceId] = useState("");
  const [txnNotes, setTxnNotes] = useState("");
  const [isSubmittingTxn, setIsSubmittingTxn] = useState(false);

  const handleAddTxnSubmit = async () => {
    if (!selectedQuotation?._id) return;
    const amt = parseFloat(txnAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert("Validation Error", "Please enter a valid payment amount.");
      return;
    }

    setIsSubmittingTxn(true);
    try {
      const res = await quotationApi.addQuotationTransaction(
        selectedQuotation._id,
        {
          amount: amt,
          paymentMethod: txnPaymentMethod,
          referenceId: txnReferenceId.trim() || undefined,
          notes: txnNotes.trim() || undefined,
          status: "Completed",
        },
      );

      if (res?.success) {
        Alert.alert(
          "Payment Recorded",
          res.message || `Payment of ${formatINR(amt)} recorded successfully.`,
        );
        setIsAddTxnModalOpen(false);
        setTxnAmount("");
        setTxnReferenceId("");
        setTxnNotes("");

        setSelectedQuotation((prev) =>
          prev
            ? {
                ...prev,
                paymentSummary: res.paymentSummary,
                transactions: res.transactions,
              }
            : null,
        );

        loadData();
      }
    } catch (err: any) {
      Alert.alert(
        "Transaction Error",
        err?.response?.data?.message || "Failed to record payment transaction.",
      );
    } finally {
      setIsSubmittingTxn(false);
    }
  };

  // ── Form State for New / Edit Quotation ────────────────────────────────────
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(
    null,
  );

  // Step 1: Client & Project
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectType, setProjectType] = useState("Residential Interior");
  const [siteLocation, setSiteLocation] = useState("");
  const [validityDays, setValidityDays] = useState("30");

  // Step 2: Rooms & Items
  const [roomCategories, setRoomCategories] = useState<string[]>(DEFAULT_ROOMS);
  const [subItemMap, setSubItemMap] = useState<Record<string, string[]>>(
    DEFAULT_CATEGORY_SUB_ITEMS,
  );
  const [selectedRoom, setSelectedRoom] = useState("Modular Kitchen");
  const [showCustomRoomInput, setShowCustomRoomInput] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [showCustomSubItemInput, setShowCustomSubItemInput] = useState(false);
  const [customSubItemName, setCustomSubItemName] = useState("");
  const [items, setItems] = useState<QuotationItemDoc[]>([]);

  // Item Sub-form
  const DEFAULT_UNITS = ["Sq Ft", "Lumpsum", "Pieces", "+ Add More"];
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNITS);
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [customUnitName, setCustomUnitName] = useState("");

  const [materialOptions, setMaterialOptions] = useState<string[]>(
    DEFAULT_MATERIAL_OPTIONS,
  );
  const [showCustomMaterialInput, setShowCustomMaterialInput] = useState(false);
  const [customMaterialName, setCustomMaterialName] = useState("");

  const [hardwareOptions, setHardwareOptions] = useState<string[]>(
    DEFAULT_HARDWARE_OPTIONS,
  );
  const [showCustomHardwareInput, setShowCustomHardwareInput] = useState(false);
  const [customHardwareName, setCustomHardwareName] = useState("");

  const [accessoryOptions, setAccessoryOptions] = useState<string[]>(
    DEFAULT_ACCESSORY_OPTIONS,
  );
  const [showCustomAccessoryInput, setShowCustomAccessoryInput] =
    useState(false);
  const [customAccessoryName, setCustomAccessoryName] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [descriptionOptions, setDescriptionOptions] = useState<string[]>(
    DEFAULT_DESCRIPTION_OPTIONS,
  );
  const [showCustomDescriptionInput, setShowCustomDescriptionInput] =
    useState(false);
  const [customDescriptionText, setCustomDescriptionText] = useState("");
  const [itemUnit, setItemUnit] = useState<string>("Sq Ft");
  const [itemSize, setItemSize] = useState("1");
  const [itemRate, setItemRate] = useState("");
  // Specs
  const [specCarcass, setSpecCarcass] = useState("HDHMR Board – Action Tesa");
  const [specShutter, setSpecShutter] = useState("Acrylic Finish");
  const [specFinish, setSpecFinish] = useState("High Gloss Acrylic");
  const [specBrand, setSpecBrand] = useState("Action TESA / Merino");
  const [specHardware, setSpecHardware] = useState("Hettich Soft Close");
  const [specThickness, setSpecThickness] = useState("18mm");
  // Accessories
  const [accName, setAccName] = useState("");
  const [accQty, setAccQty] = useState("1");
  const [accInclusion, setAccInclusion] = useState<
    "INCLUDED" | "EXCLUDED" | "LUMP_SUM" | "ACTUAL_COST"
  >("INCLUDED");
  const [itemAccessories, setItemAccessories] = useState<
    Array<{ name: string; qty: number; inclusionType: any; cost: number }>
  >([]);
  const [itemRemarks, setItemRemarks] = useState("");

  // Step 3: Charges, GST, Discount
  const [handlingPercent, setHandlingPercent] = useState("2");
  const [designPercent, setDesignPercent] = useState("2");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [gstType, setGstType] = useState<"AS_PER_ACTUAL" | "CGST_SGST" | "IGST">("AS_PER_ACTUAL");

  // Step 4: Milestones & Notes
  const [milestones, setMilestones] = useState<QuotationMilestone[]>(
    DEFAULT_MILESTONES_INPUT,
  );
  const [quotationNotes, setQuotationNotes] = useState("");

  // ── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [listRes, sumRes] = await Promise.all([
        quotationApi.getQuotations({
          status: activeStatus !== "ALL" ? activeStatus : undefined,
          search: searchQuery.trim() ? searchQuery.trim() : undefined,
        }),
        quotationApi.getSummary(),
      ]);

      if (listRes?.success) {
        setQuotations(listRes.quotations || []);
      }
      if (sumRes?.success) {
        setSummary(sumRes.summary || null);
      }
    } catch (error) {
      console.error("Error loading quotations:", error);
    }
  }, [activeStatus, searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // ── Live Calculation for Modal Form ────────────────────────────────────────
  const liveCalculation = useMemo(() => {
    const rawSubtotal = items.reduce(
      (acc, it) => acc + (it.amount || it.quantity * it.rate || 0),
      0,
    );
    const handlingFee = Math.round(
      rawSubtotal * ((parseFloat(handlingPercent) || 0) / 100),
    );
    const designFee = Math.round(
      rawSubtotal * ((parseFloat(designPercent) || 0) / 100),
    );

    const discVal = parseFloat(discountValue) || 0;
    const discountAmt =
      discountType === "PERCENT"
        ? Math.round(rawSubtotal * (discVal / 100))
        : Math.min(rawSubtotal, discVal);

    const taxable = Math.max(
      0,
      rawSubtotal + handlingFee + designFee - discountAmt,
    );
    const gstPct = parseFloat(gstPercent) || 0;
    const gstAmt = gstType === "AS_PER_ACTUAL" ? 0 : Math.round(taxable * (gstPct / 100));
    const grandTotal = taxable + gstAmt;

    const totalMilestonePct = milestones.reduce(
      (acc, m) => acc + (Number(m.percentage) || 0),
      0,
    );
    const isMilestonesValid = Math.abs(totalMilestonePct - 100) < 0.5;

    return {
      rawSubtotal,
      handlingFee,
      designFee,
      discountAmt,
      taxable,
      gstAmt,
      grandTotal,
      totalMilestonePct,
      isMilestonesValid,
    };
  }, [
    items,
    handlingPercent,
    designPercent,
    discountType,
    discountValue,
    gstPercent,
    gstType,
    milestones,
  ]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const autoAddSubItemOption = (room: string, name: string) => {
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

  const handleSelectRoom = (r: string) => {
    if (r === "Custom" || r === "+ Add More") {
      setShowCustomRoomInput(true);
      return;
    }
    setSelectedRoom(r);
    setShowCustomRoomInput(false);
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
    const trimmed = customRoomName.trim();
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
    setCustomRoomName("");
    setShowCustomRoomInput(false);
  };

  const handleSelectSubItem = (subItem: string) => {
    if (subItem === "+ Add More") {
      setShowCustomSubItemInput(true);
      return;
    }
    setItemName(subItem);
    setShowCustomSubItemInput(false);
  };

  const handleConfirmCustomSubItem = (overrideName?: string) => {
    const trimmed = (overrideName || customSubItemName).trim();
    if (!trimmed) return;

    autoAddSubItemOption(selectedRoom, trimmed);
    setItemName(trimmed);
    setCustomSubItemName("");
    setShowCustomSubItemInput(false);
  };

  const handleSelectUnit = (u: string) => {
    if (u === "+ Add More") {
      setShowCustomUnitInput(true);
      return;
    }
    setItemUnit(u);
    setShowCustomUnitInput(false);
  };

  const handleSelectDescription = (desc: string) => {
    if (desc === "+ Add More") {
      setShowCustomDescriptionInput(true);
      return;
    }
    setItemDesc(desc);
    setShowCustomDescriptionInput(false);
  };

  const handleConfirmCustomDescription = (overrideVal?: string) => {
    const trimmed = (overrideVal || customDescriptionText).trim();
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

  const handleConfirmCustomUnit = (overrideName?: string) => {
    const trimmed = (overrideName || customUnitName).trim();
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

  const handleSelectMaterial = (m: string) => {
    if (m === "+ Add More") {
      setShowCustomMaterialInput(true);
      return;
    }
    setSpecCarcass(m);
    setShowCustomMaterialInput(false);
  };

  const handleConfirmCustomMaterial = (overrideName?: string) => {
    const trimmed = (overrideName || customMaterialName).trim();
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

  const handleSelectHardware = (h: string) => {
    if (h === "+ Add More") {
      setShowCustomHardwareInput(true);
      return;
    }
    setSpecHardware(h);
    setShowCustomHardwareInput(false);
  };

  const handleConfirmCustomHardware = (overrideName?: string) => {
    const trimmed = (overrideName || customHardwareName).trim();
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

  const handleSelectAccessory = (acc: string) => {
    if (acc === "+ Add More") {
      setShowCustomAccessoryInput(true);
      return;
    }
    setAccName(acc);
    setShowCustomAccessoryInput(false);
  };

  const handleConfirmCustomAccessory = (overrideName?: string) => {
    const trimmed = (overrideName || customAccessoryName).trim();
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
    setCustomAccessoryName("");
    setShowCustomAccessoryInput(false);
  };

  const handleAddAccessory = () => {
    const trimmed = accName.trim();
    if (!trimmed) return;
    const qty = parseInt(accQty, 10) || 1;
    setItemAccessories((prev) => [
      ...prev,
      { name: trimmed, qty, inclusionType: "INCLUDED", cost: 0 },
    ]);
    setAccName("");
    setAccQty("1");
  };

  const handleAddItemToRoom = () => {
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      Alert.alert("Validation Error", "Please enter an item name.");
      return;
    }

    autoAddSubItemOption(selectedRoom, trimmedName);

    const rateNum = parseFloat(itemRate) || 0;
    const sizeNum = parseFloat(itemSize) || 0;
    const qtyNum = sizeNum > 0 ? sizeNum : 1;
    const itemAmt = Math.round(qtyNum * rateNum);

    const newItem: QuotationItemDoc = {
      itemNumber: items.length + 1,
      room: selectedRoom,
      name: trimmedName,
      description: itemDesc.trim(),
      unit: itemUnit || "Sq Ft",
      measurements: {
        length: 0,
        width: 0,
        height: 0,
        calculatedArea: sizeNum,
      },
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
      costVariationNote: "Cost may vary as per Design or Measurements.",
    };

    setItems((prev) => [...prev, newItem]);

    // Reset item fields
    setItemName("");
    setItemDesc("");
    setItemSize("1");
    setItemRate("");
    setItemAccessories([]);
    setItemRemarks("");
    Alert.alert("Item Added", `"${newItem.name}" added to ${selectedRoom}`);
  };

  const handleOpenCreateModal = (existing?: QuotationDoc) => {
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
      setItems(existing.items || []);
      if (existing.items && existing.items.length > 0) {
        const existingRooms = Array.from(
          new Set(existing.items.map((i) => i.room).filter(Boolean)),
        );
        const base = DEFAULT_ROOMS.filter(
          (r) => r !== "Custom" && r !== "+ Add More",
        );
        const specials = DEFAULT_ROOMS.filter(
          (r) => r === "Custom" || r === "+ Add More",
        );
        const merged = Array.from(
          new Set([...base, ...existingRooms, ...specials]),
        );
        setRoomCategories(merged);
        setSelectedRoom(existing.items[0]?.room || "Modular Kitchen");
      } else {
        setRoomCategories(DEFAULT_ROOMS);
        setSelectedRoom("Modular Kitchen");
      }
      setShowCustomRoomInput(false);
      setCustomRoomName("");
      setHandlingPercent(String(existing.pricing?.handlingFeePercent || 2));
      setDesignPercent(String(existing.pricing?.designFeePercent || 2));
      setDiscountType(existing.pricing?.discountType || "PERCENT");
      setDiscountValue(String(existing.pricing?.discountValue || 0));
      setGstPercent(String(existing.pricing?.gstPercent || 18));
      setGstType(existing.pricing?.gstType || "AS_PER_ACTUAL");
      setMilestones(
        existing.paymentMilestones && existing.paymentMilestones.length > 0
          ? existing.paymentMilestones
          : DEFAULT_MILESTONES_INPUT,
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
      setRoomCategories(DEFAULT_ROOMS);
      setSelectedRoom("Modular Kitchen");
      setShowCustomRoomInput(false);
      setCustomRoomName("");
      setHandlingPercent("2");
      setDesignPercent("2");
      setDiscountType("PERCENT");
      setDiscountValue("0");
      setGstPercent("18");
      setGstType("AS_PER_ACTUAL");
      setMilestones(DEFAULT_MILESTONES_INPUT);
      setQuotationNotes("");
    }
    setFormStep(1);
    setIsCreateModalOpen(true);
  };

  const handleSaveQuotation = async () => {
    if (!clientName.trim()) {
      Alert.alert("Validation Error", "Client name is required.");
      setFormStep(1);
      return;
    }
    if (items.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please add at least one quotation work item.",
      );
      setFormStep(2);
      return;
    }
    if (!liveCalculation.isMilestonesValid) {
      Alert.alert(
        "Validation Error",
        `Milestone percentages must equal 100%. Currently: ${liveCalculation.totalMilestonePct}%`,
      );
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
        projectTitle:
          projectTitle.trim() || `${clientName.trim()} Interior Proposal`,
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
        const res = await quotationApi.updateQuotation(
          editingQuotationId,
          payload,
        );
        if (res?.success) {
          Alert.alert("Quotation Updated", res.message);
          setIsCreateModalOpen(false);
          loadData();
        }
      } else {
        const res = await quotationApi.createQuotation(payload);
        if (res?.success) {
          Alert.alert(
            "Quotation Created",
            `Quotation ${res.quotation.quotationNumber} generated successfully!`,
          );
          setIsCreateModalOpen(false);
          loadData();
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to save quotation.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Actions on Selected Quotation ──────────────────────────────────────────
  const handleDownloadPdf = async (q: QuotationDoc) => {
    try {
      setIsActionLoading(true);
      await downloadPdf(q);
    } catch (err: any) {
      Alert.alert("Download Error", err?.message || "Could not generate PDF.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSharePdf = async (q: QuotationDoc) => {
    try {
      setIsActionLoading(true);
      await sharePdf(q);
    } catch (err: any) {
      Alert.alert("Share Error", err?.message || "Could not share PDF.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenEmailModal = (q: QuotationDoc) => {
    setSelectedQuotation(q);
    setEmailRecipient(q.client?.email || "");
    setEmailCc("");
    setEmailSubject(
      `[Altera Interior] Quotation Proposal ${q.quotationNumber} - ${q.projectTitle}`,
    );
    setEmailMessage(
      `Dear ${q.client?.name || "Client"},\n\nPlease find attached the official interior quotation proposal for ${q.projectTitle || "your project"}.\n\nEstimated Grand Total: ${formatINR(q.pricing?.grandTotal)}.\n\nLooking forward to working with you!\n\nWarm regards,\nAltera Interior Team`,
    );
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedQuotation || !emailRecipient.trim()) {
      Alert.alert("Validation Error", "Recipient email is required.");
      return;
    }
    setIsSendingEmail(true);
    try {
      // Generate device PDF base64
      const { base64 } = await generatePdf(selectedQuotation);
      const res = await quotationApi.sendQuotation(selectedQuotation._id, {
        recipientEmail: emailRecipient.trim(),
        cc: emailCc.trim() || undefined,
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
        pdfBase64: base64,
      });

      if (res?.success) {
        Alert.alert(
          "Quotation Sent",
          `Proposal PDF successfully emailed to ${emailRecipient}!`,
        );
        setIsEmailModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      Alert.alert(
        "Dispatch Error",
        err?.response?.data?.message || "Failed to dispatch email.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleConvertToProject = async (q: QuotationDoc) => {
    Alert.alert(
      "Convert to Project",
      `Convert Quotation ${q.quotationNumber} (${formatINR(q.pricing?.grandTotal)}) into an active project in CRM?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Convert Now",
          onPress: async () => {
            setIsActionLoading(true);
            try {
              const res = await quotationApi.convertToProject(q._id);
              if (res?.success) {
                Alert.alert(
                  "Project Created",
                  `Successfully converted to Project ${res.project.projectId}! Budget: ${formatINR(res.project.value)}. View under Projects tab.`,
                );
                setIsDetailModalOpen(false);
                loadData();
              }
            } catch (err: any) {
              Alert.alert(
                "Conversion Failed",
                err?.response?.data?.message || "Could not convert to project.",
              );
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Quotation Manager</Text>
            <Text style={styles.headerSub}>
              Interior | Architecture | Construction
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newQuoteBtn}
            onPress={() => handleOpenCreateModal()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#7A131A" />
            <Text style={styles.newQuoteText}>New Quote</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color="#9CA3AF"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quotation no, client, project..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      {summary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.kpiScroll}
          contentContainerStyle={styles.kpiContainer}
        >
          <View style={[styles.kpiCard, { borderLeftColor: "#7A131A" }]}>
            <Text style={styles.kpiLabel}>Total Pipeline</Text>
            <Text style={styles.kpiVal}>
              {formatINR(summary.totalPipelineValue)}
            </Text>
            <Text style={styles.kpiCount}>
              {summary.totalQuotations} Quotations
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>Approved / Converted</Text>
            <Text style={[styles.kpiVal, { color: "#059669" }]}>
              {formatINR(summary.approvedValue)}
            </Text>
            <Text style={styles.kpiCount}>
              {summary.approvedCount + summary.convertedCount} Projects
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>In Discussion / Sent</Text>
            <Text style={[styles.kpiVal, { color: "#D97706" }]}>
              {summary.sentCount}
            </Text>
            <Text style={styles.kpiCount}>Pending Client Review</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#6B7280" }]}>
            <Text style={styles.kpiLabel}>Drafts</Text>
            <Text style={[styles.kpiVal, { color: "#4B5563" }]}>
              {summary.draftCount}
            </Text>
            <Text style={styles.kpiCount}>Work In Progress</Text>
          </View>
        </ScrollView>
      )}

      {/* ── Status Pills Filter ──────────────────────────────────────────────── */}
      <View style={styles.pillsRow}>
        {[
          "ALL",
          "Draft",
          "Sent",
          "Approved",
          "Converted to Project",
          "Rejected",
        ].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.pill, activeStatus === st && styles.pillActive]}
            onPress={() => setActiveStatus(st)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                activeStatus === st && styles.pillTextActive,
              ]}
            >
              {st === "Converted to Project" ? "Converted" : st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Main List ────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#7A131A"
          />
        }
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#7A131A" />
            <Text style={styles.loadingText}>
              Loading interior quotations...
            </Text>
          </View>
        ) : quotations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Quotations Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? "Try changing your search keywords or filter."
                : 'Tap "+ New Quote" to create an interior proposal.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => handleOpenCreateModal()}
            >
              <Text style={styles.emptyBtnText}>Create First Quotation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          quotations.map((q) => {
            const isApproved =
              q.status === "Approved" || q.status === "Converted to Project";
            const isSent =
              q.status === "Sent" ||
              q.status === "Viewed" ||
              q.status === "Under Discussion";

            return (
              <TouchableOpacity
                key={q._id}
                style={styles.quoteCard}
                onPress={() => {
                  setSelectedQuotation(q);
                  setIsDetailModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.quoteNoRow}>
                      <Text style={styles.quoteNo}>{q.quotationNumber}</Text>
                      {q.revision > 0 && (
                        <View style={styles.revBadge}>
                          <Text style={styles.revText}>Rev {q.revision}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.projectText} numberOfLines={1}>
                      {q.projectTitle}
                    </Text>
                    <Text style={styles.clientName}>
                      Client:{" "}
                      <Text style={styles.boldText}>{q.client?.name}</Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View
                      style={[
                        styles.statusTag,
                        isApproved && styles.statusTagApproved,
                        isSent && styles.statusTagSent,
                        q.status === "Draft" && styles.statusTagDraft,
                        q.status === "Rejected" && styles.statusTagRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          isApproved && styles.statusTextApproved,
                          isSent && styles.statusTextSent,
                          q.status === "Draft" && styles.statusTextDraft,
                          q.status === "Rejected" && styles.statusTextRejected,
                        ]}
                      >
                        {q.status}
                      </Text>
                    </View>
                    <Text style={styles.grandTotalText}>
                      {formatINR(q.pricing?.grandTotal)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <View style={styles.dateCol}>
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color="#64748B"
                    />
                    <Text style={styles.dateVal}>
                      Date: {formatDate(q.quotationDate)}
                    </Text>
                  </View>
                  <View style={styles.dateCol}>
                    <Ionicons name="layers-outline" size={13} color="#64748B" />
                    <Text style={styles.dateVal}>
                      {q.items?.length || 0} Work Items
                    </Text>
                  </View>
                  <View style={styles.actionPills}>
                    <TouchableOpacity
                      style={styles.quickIconBtn}
                      onPress={() => handleDownloadPdf(q)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="download-outline"
                        size={16}
                        color="#7A131A"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickIconBtn}
                      onPress={() => handleOpenEmailModal(q)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="mail-outline" size={16} color="#7A131A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── DETAIL & ACTION MODAL ────────────────────────────────────────────── */}
      <Modal
        visible={isDetailModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsDetailModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCardModal}>
            {selectedQuotation && (
              <>
                <View style={styles.modalHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {selectedQuotation.quotationNumber}
                    </Text>
                    <Text style={styles.modalSub}>
                      {selectedQuotation.projectTitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsDetailModalOpen(false)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={{ padding: 18 }}
                >
                  {/* Client Summary */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.boxTitle}>
                      Client &amp; Site Details
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Name:</Text>{" "}
                      {selectedQuotation.client?.name}
                    </Text>
                    {selectedQuotation.client?.company ? (
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>Company:</Text>{" "}
                        {selectedQuotation.client?.company}
                      </Text>
                    ) : null}
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Phone:</Text>{" "}
                      {selectedQuotation.client?.phone || "—"}
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Email:</Text>{" "}
                      {selectedQuotation.client?.email || "—"}
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Site Address:</Text>{" "}
                      {selectedQuotation.siteLocation ||
                        selectedQuotation.client?.address ||
                        "—"}
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Validity:</Text> Until{" "}
                      {formatDate(selectedQuotation.validUntil)}
                    </Text>
                  </View>

                  {/* Pricing Overview */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.boxTitle}>Financial Breakdown</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Items Subtotal:</Text>
                      <Text style={styles.priceVal}>
                        {formatINR(selectedQuotation.pricing?.subtotal)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        Handling Charges (
                        {selectedQuotation.pricing?.handlingFeePercent || 2}%):
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(
                          selectedQuotation.pricing?.handlingFeeAmount,
                        )}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        Designing Fees (
                        {selectedQuotation.pricing?.designFeePercent || 2}%):
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(selectedQuotation.pricing?.designFeeAmount)}
                      </Text>
                    </View>
                    {selectedQuotation.pricing?.discountAmount > 0 && (
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: "#059669" }]}>
                          Special Discount:
                        </Text>
                        <Text style={[styles.priceVal, { color: "#059669" }]}>
                          -
                          {formatINR(selectedQuotation.pricing?.discountAmount)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Taxable Total:</Text>
                      <Text style={styles.priceVal}>
                        {formatINR(selectedQuotation.pricing?.taxableAmount)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        GST ({selectedQuotation.pricing?.gstPercent || 18}%):
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(selectedQuotation.pricing?.totalGstAmount)}
                      </Text>
                    </View>
                    <View style={[styles.priceRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>
                        Estimated Grand Total:
                      </Text>
                      <Text style={styles.grandTotalVal}>
                        {formatINR(selectedQuotation.pricing?.grandTotal)}
                      </Text>
                    </View>
                    {selectedQuotation.pricing?.amountInWords ? (
                      <Text style={styles.wordsText}>
                        In Words: {selectedQuotation.pricing.amountInWords}
                      </Text>
                    ) : null}
                  </View>

                  {/* Payment & Transaction Summary Card */}
                  <View style={[styles.sectionBox, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={styles.boxTitle}>Payment &amp; Transactions</Text>
                      <View
                        style={[
                          styles.statusTag,
                          selectedQuotation.paymentSummary?.paymentStatus === 'PAID'
                            ? styles.statusTagApproved
                            : selectedQuotation.paymentSummary?.paymentStatus === 'PARTIALLY_PAID'
                            ? styles.statusTagSent
                            : styles.statusTagRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            selectedQuotation.paymentSummary?.paymentStatus === 'PAID'
                              ? styles.statusTextApproved
                              : selectedQuotation.paymentSummary?.paymentStatus === 'PARTIALLY_PAID'
                              ? styles.statusTextSent
                              : styles.statusTextRejected,
                          ]}
                        >
                          {(selectedQuotation.paymentSummary?.paymentStatus || 'UNPAID').replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.priceLabel}>Quotation Grand Total:</Text>
                      <Text style={styles.priceVal}>{formatINR(selectedQuotation.paymentSummary?.totalAmount || selectedQuotation.pricing?.grandTotal)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[styles.priceLabel, { color: '#059669' }]}>Total Amount Paid:</Text>
                      <Text style={[styles.priceVal, { color: '#059669', fontWeight: '800' }]}>{formatINR(selectedQuotation.paymentSummary?.paidAmount || 0)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={[styles.priceLabel, { color: '#DC2626' }]}>Balance Remaining:</Text>
                      <Text style={[styles.priceVal, { color: '#DC2626', fontWeight: '800' }]}>{formatINR(selectedQuotation.paymentSummary?.remainingAmount ?? (selectedQuotation.pricing?.grandTotal || 0))}</Text>
                    </View>

                    {/* Record Payment Button */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#7A131A',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginBottom: 12,
                      }}
                      onPress={() => {
                        setTxnAmount(String(selectedQuotation.paymentSummary?.remainingAmount || selectedQuotation.pricing?.grandTotal || ''));
                        setIsAddTxnModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Record Payment / Transaction</Text>
                    </TouchableOpacity>

                    {/* Transaction History List */}
                    {selectedQuotation.transactions && selectedQuotation.transactions.length > 0 ? (
                      <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
                          Recorded Transactions ({selectedQuotation.transactions.length}):
                        </Text>
                        {selectedQuotation.transactions.map((tx: any, idx: number) => (
                          <View key={tx._id || idx} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{tx.transactionId || tx.referenceId || `TXN-${idx + 1}`}</Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>{formatINR(tx.amount)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>Mode: {tx.paymentMethod || 'UPI'} • {formatDate(tx.transactionDate || tx.createdAt)}</Text>
                              <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>{tx.status || 'Completed'}</Text>
                            </View>
                            {tx.notes ? <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', marginTop: 2 }}>Note: {tx.notes}</Text> : null}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 4 }}>
                        No transactions recorded yet for this quotation.
                      </Text>
                    )}
                  </View>

                  {/* Room Items List */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.boxTitle}>
                      Scope Items ({selectedQuotation.items?.length || 0})
                    </Text>
                    {selectedQuotation.items?.map((it, idx) => (
                      <View key={idx} style={styles.itemCard}>
                        <View style={styles.itemCardHead}>
                          <Text style={styles.itemCardRoom}>[{it.room}]</Text>
                          <Text style={styles.itemCardAmt}>
                            {formatINR(it.amount)}
                          </Text>
                        </View>
                        <Text style={styles.itemCardName}>{it.name}</Text>
                        <Text style={styles.itemCardQty}>
                          {it.quantity} {it.unit} @ {formatINR(it.rate)}
                          {it.measurements?.calculatedArea
                            ? ` (Area: ${it.measurements.calculatedArea} ${it.unit})`
                            : ""}
                        </Text>
                        {it.specifications?.carcass ? (
                          <Text style={styles.itemCardSpecs}>
                            Specs: {it.specifications.carcass} |{" "}
                            {it.specifications.shutter} |{" "}
                            {it.specifications.brand}
                          </Text>
                        ) : null}
                        {it.accessories && it.accessories.length > 0 ? (
                          <Text style={styles.itemCardAcc}>
                            Accessories:{" "}
                            {it.accessories
                              .map((a) => `${a.name} (${a.qty})`)
                              .join(", ")}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  {/* Payment Milestones */}
                  {selectedQuotation.paymentMilestones &&
                    selectedQuotation.paymentMilestones.length > 0 && (
                      <View style={styles.sectionBox}>
                        <Text style={styles.boxTitle}>Payment Milestones</Text>
                        {selectedQuotation.paymentMilestones.map((m, idx) => (
                          <View key={idx} style={styles.milestoneRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.msName}>
                                {m.milestoneName}
                              </Text>
                              <Text style={styles.msStage}>
                                {m.stage || "Stage Completion"}
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={styles.msPct}>{m.percentage}%</Text>
                              <Text style={styles.msAmt}>
                                {formatINR(m.amount)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* Action Buttons Inside Modal */}
                  <View style={styles.actionButtonsCol}>
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => handleDownloadPdf(selectedQuotation)}
                    >
                      <Ionicons
                        name="document-text"
                        size={18}
                        color="#ffffff"
                      />
                      <Text style={styles.primaryActionBtnText}>
                        Download Professional PDF
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => handleSharePdf(selectedQuotation)}
                      >
                        <Ionicons
                          name="share-social-outline"
                          size={16}
                          color="#7A131A"
                        />
                        <Text style={styles.secondaryActionBtnText}>
                          Share / WhatsApp
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => {
                          setIsDetailModalOpen(false);
                          handleOpenEmailModal(selectedQuotation);
                        }}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={16}
                          color="#7A131A"
                        />
                        <Text style={styles.secondaryActionBtnText}>
                          Email to Client
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={() => {
                        setIsDetailModalOpen(false);
                        handleOpenCreateModal(selectedQuotation);
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#475569"
                      />
                      <Text style={styles.editActionBtnText}>
                        Edit / Revise Quotation
                      </Text>
                    </TouchableOpacity>

                    {/* Convert to Project Action */}
                    {selectedQuotation.status !== "Converted to Project" && (
                      <TouchableOpacity
                        style={styles.convertBtn}
                        onPress={() =>
                          handleConvertToProject(selectedQuotation)
                        }
                      >
                        <Ionicons
                          name="rocket-outline"
                          size={18}
                          color="#ffffff"
                        />
                        <Text style={styles.convertBtnText}>
                          Convert to Active Project
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── CREATE / EDIT QUOTATION MODAL ────────────────────────────────────── */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <SafeAreaView style={styles.creatorRoot} edges={["top", "bottom"]}>
          {/* Header */}
          <View style={styles.creatorHeader}>
            <TouchableOpacity
              onPress={() => setIsCreateModalOpen(false)}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.creatorTitle}>
              {editingQuotationId
                ? "Revise Quotation"
                : "Create Interior Quotation"}
            </Text>
            <TouchableOpacity
              style={styles.saveHeaderBtn}
              onPress={handleSaveQuotation}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#7A131A" />
              ) : (
                <Text style={styles.saveHeaderText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Steps Indicator */}
          <View style={styles.stepTabs}>
            {[
              { num: 1, label: "Client" },
              { num: 2, label: "Items & Rooms" },
              { num: 3, label: "Pricing & GST" },
              { num: 4, label: "Milestones" },
            ].map((s) => (
              <TouchableOpacity
                key={s.num}
                style={[
                  styles.stepTab,
                  formStep === s.num && styles.stepTabActive,
                ]}
                onPress={() => setFormStep(s.num as any)}
              >
                <Text
                  style={[
                    styles.stepTabNum,
                    formStep === s.num && styles.stepTabNumActive,
                  ]}
                >
                  {s.num}
                </Text>
                <Text
                  style={[
                    styles.stepTabLabel,
                    formStep === s.num && styles.stepTabLabelActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18 }}
          >
            {/* STEP 1: CLIENT & PROJECT */}
            {formStep === 1 && (
              <View>
                <Text style={styles.formSectionTitle}>Client Information</Text>
                <Text style={styles.inputLabel}>Client Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rahul Sharma"
                  value={clientName}
                  onChangeText={setClientName}
                />

                <Text style={styles.inputLabel}>Company Name (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Sharma Residences"
                  value={clientCompany}
                  onChangeText={setClientCompany}
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="+91 98765 43210"
                      keyboardType="phone-pad"
                      value={clientPhone}
                      onChangeText={setClientPhone}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="client@example.com"
                      keyboardType="email-address"
                      value={clientEmail}
                      onChangeText={setClientEmail}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Site / Project Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Flat 402, Lotus Heights, Sector 50"
                  value={clientAddress}
                  onChangeText={setClientAddress}
                />

                <Text style={styles.inputLabel}>
                  Client GSTIN (If corporate)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={clientGstin}
                  onChangeText={setClientGstin}
                />

                <Text style={[styles.formSectionTitle, { marginTop: 24 }]}>
                  Project Parameters
                </Text>
                <Text style={styles.inputLabel}>Project Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 3BHK Luxury Interior Execution"
                  value={projectTitle}
                  onChangeText={setProjectTitle}
                />

                <Text style={styles.inputLabel}>Project Type</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Residential Interior / Commercial / Villa"
                  value={projectType}
                  onChangeText={setProjectType}
                />

                <Text style={styles.inputLabel}>Site Location / City</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Gurugram / Noida / Delhi"
                  value={siteLocation}
                  onChangeText={setSiteLocation}
                />

                <TouchableOpacity
                  style={styles.nextStepBtn}
                  onPress={() => setFormStep(2)}
                >
                  <Text style={styles.nextStepBtnText}>
                    Next: Add Rooms &amp; Work Items →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: ROOMS & WORK ITEMS */}
            {formStep === 2 && (
              <View>
                <Text style={styles.formSectionTitle}>
                  1. Select Room / Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 12 }}
                >
                  {roomCategories.map((r) => {
                    const isSpecial = r === "Custom" || r === "+ Add More";
                    const isActive = selectedRoom === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roomPill,
                          isActive && styles.roomPillActive,
                          isSpecial &&
                            !isActive && {
                              borderColor: "#7A131A",
                              backgroundColor: "#FFF5F5",
                            },
                        ]}
                        onPress={() => handleSelectRoom(r)}
                      >
                        <Text
                          style={[
                            styles.roomPillText,
                            isActive && styles.roomPillTextActive,
                            isSpecial &&
                              !isActive && {
                                color: "#7A131A",
                                fontWeight: "700",
                              },
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {(showCustomRoomInput ||
                  selectedRoom === "Custom" ||
                  selectedRoom === "+ Add More") && (
                  <View style={styles.customRoomInputCard}>
                    <Text style={styles.inputLabel}>
                      Enter Custom Category Name *
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 8, marginTop: 4 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Enter Custom Category Name"
                        placeholderTextColor="#94A3B8"
                        value={customRoomName}
                        onChangeText={setCustomRoomName}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={handleConfirmCustomRoom}
                      >
                        <Ionicons name="add" size={16} color="#ffffff" />
                        <Text style={styles.addCustomBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Sub-Item Pills Selection */}
                <View
                  style={{
                    marginBottom: 14,
                    backgroundColor: "#ffffff",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: "#0F172A", fontWeight: "800" },
                    ]}
                  >
                    2. Select Item Name for{" "}
                    <Text style={{ color: "#7A131A" }}>{selectedRoom}</Text>:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8 }}
                  >
                    {(
                      subItemMap[selectedRoom] ||
                      DEFAULT_CATEGORY_SUB_ITEMS[selectedRoom] || ["+ Add More"]
                    ).map((sub) => {
                      const isActive = itemName === sub;
                      const isAddMore = sub === "+ Add More";
                      return (
                        <TouchableOpacity
                          key={sub}
                          style={[
                            styles.roomPill,
                            isActive && styles.roomPillActive,
                            isAddMore &&
                              !isActive && {
                                borderColor: "#7A131A",
                                backgroundColor: "#FFF5F5",
                              },
                          ]}
                          onPress={() => handleSelectSubItem(sub)}
                        >
                          <Text
                            style={[
                              styles.roomPillText,
                              isActive && styles.roomPillTextActive,
                              isAddMore &&
                                !isActive && {
                                  color: "#7A131A",
                                  fontWeight: "700",
                                },
                            ]}
                          >
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {showCustomSubItemInput && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder={`Type custom item name for ${selectedRoom}...`}
                        value={customSubItemName}
                        onChangeText={(val) => {
                          setCustomSubItemName(val);
                          if (val.trim()) setItemName(val);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => handleConfirmCustomSubItem()}
                      >
                        <Text style={styles.addCustomBtnText}>
                          + Add Option
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Item Composer Card */}
                <View style={styles.itemComposerCard}>
                  <Text style={styles.composerHeader}>
                    Configure Details for {itemName || selectedRoom}
                  </Text>

                  <Text style={styles.inputLabel}>Item Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type custom item name or select an option above..."
                    value={itemName}
                    onChangeText={setItemName}
                    onBlur={() => {
                      if (itemName.trim())
                        autoAddSubItemOption(selectedRoom, itemName.trim());
                    }}
                  />

                  <Text style={styles.inputLabel}>Detailed Description</Text>
                  <TextInput
                    style={[styles.textInput, { height: 50 }]}
                    placeholder="Type description or select a preset below..."
                    multiline
                    value={itemDesc}
                    onChangeText={setItemDesc}
                  />

                  {/* Description Option Chips */}
                  <Text
                    style={[
                      styles.inputLabel,
                      { marginTop: 6, fontSize: 11, color: "#64748B" },
                    ]}
                  >
                    Select Description Preset / Add Custom Option:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                  >
                    {descriptionOptions.map((desc) => {
                      const isActive = itemDesc === desc;
                      const isAddMore = desc === "+ Add More";
                      return (
                        <TouchableOpacity
                          key={desc}
                          style={[
                            styles.roomPill,
                            isActive && styles.roomPillActive,
                            isAddMore &&
                              !isActive && {
                                borderColor: "#7A131A",
                                backgroundColor: "#FFF5F5",
                              },
                          ]}
                          onPress={() => handleSelectDescription(desc)}
                        >
                          <Text
                            style={[
                              styles.roomPillText,
                              isActive && styles.roomPillTextActive,
                              isAddMore &&
                                !isActive && {
                                  color: "#7A131A",
                                  fontWeight: "700",
                                },
                            ]}
                          >
                            {desc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {showCustomDescriptionInput && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Type custom description option..."
                        value={customDescriptionText}
                        onChangeText={(val) => {
                          setCustomDescriptionText(val);
                          if (val.trim()) setItemDesc(val);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => handleConfirmCustomDescription()}
                      >
                        <Text style={styles.addCustomBtnText}>+ Option</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Unit Selection Pills */}
                  <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                    Select Unit Type:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                  >
                    {unitOptions.map((u) => {
                      const isActive = itemUnit === u;
                      const isAddMore = u === "+ Add More";
                      return (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.roomPill,
                            isActive && styles.roomPillActive,
                            isAddMore &&
                              !isActive && {
                                borderColor: "#7A131A",
                                backgroundColor: "#FFF5F5",
                              },
                          ]}
                          onPress={() => handleSelectUnit(u)}
                        >
                          <Text
                            style={[
                              styles.roomPillText,
                              isActive && styles.roomPillTextActive,
                              isAddMore &&
                                !isActive && {
                                  color: "#7A131A",
                                  fontWeight: "700",
                                },
                            ]}
                          >
                            {u}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {showCustomUnitInput && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Enter custom unit (e.g. Rft, Sets)..."
                        value={customUnitName}
                        onChangeText={(val) => {
                          setCustomUnitName(val);
                          if (val.trim()) setItemUnit(val);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => handleConfirmCustomUnit()}
                      >
                        <Text style={styles.addCustomBtnText}>+ Unit</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Merged Size & Rate Inputs */}
                  <View
                    style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Size ({itemUnit}) *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 120"
                        keyboardType="numeric"
                        value={itemSize}
                        onChangeText={setItemSize}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Rate (₹) *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 1550"
                        keyboardType="numeric"
                        value={itemRate}
                        onChangeText={setItemRate}
                      />
                    </View>
                  </View>
                  <Text
                    style={{
                      textAlign: "right",
                      fontWeight: "800",
                      color: "#0F172A",
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    Total Amt:{" "}
                    {formatINR(
                      (parseFloat(itemSize) || 0) * (parseFloat(itemRate) || 0),
                    )}
                  </Text>

                  {/* Material Option Pills */}
                  <Text style={[styles.inputLabel, { fontWeight: "700" }]}>
                    Select Core Material:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                  >
                    {materialOptions.map((m) => {
                      const isActive = specCarcass === m;
                      const isAddMore = m === "+ Add More";
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.roomPill,
                            isActive && styles.roomPillActive,
                            isAddMore &&
                              !isActive && {
                                borderColor: "#7A131A",
                                backgroundColor: "#FFF5F5",
                              },
                          ]}
                          onPress={() => handleSelectMaterial(m)}
                        >
                          <Text
                            style={[
                              styles.roomPillText,
                              isActive && styles.roomPillTextActive,
                              isAddMore &&
                                !isActive && {
                                  color: "#7A131A",
                                  fontWeight: "700",
                                },
                            ]}
                          >
                            {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {showCustomMaterialInput && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Type custom material..."
                        value={customMaterialName}
                        onChangeText={(val) => {
                          setCustomMaterialName(val);
                          if (val.trim()) setSpecCarcass(val);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => handleConfirmCustomMaterial()}
                      >
                        <Text style={styles.addCustomBtnText}>+ Material</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Hardware Option Pills */}
                  <Text
                    style={[
                      styles.inputLabel,
                      { fontWeight: "700", marginTop: 6 },
                    ]}
                  >
                    Select Hardware Option:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                  >
                    {hardwareOptions.map((h) => {
                      const isActive = specHardware === h;
                      const isAddMore = h === "+ Add More";
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.roomPill,
                            isActive && styles.roomPillActive,
                            isAddMore &&
                              !isActive && {
                                borderColor: "#7A131A",
                                backgroundColor: "#FFF5F5",
                              },
                          ]}
                          onPress={() => handleSelectHardware(h)}
                        >
                          <Text
                            style={[
                              styles.roomPillText,
                              isActive && styles.roomPillTextActive,
                              isAddMore &&
                                !isActive && {
                                  color: "#7A131A",
                                  fontWeight: "700",
                                },
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {showCustomHardwareInput && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Type custom hardware..."
                        value={customHardwareName}
                        onChangeText={(val) => {
                          setCustomHardwareName(val);
                          if (val.trim()) setSpecHardware(val);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => handleConfirmCustomHardware()}
                      >
                        <Text style={styles.addCustomBtnText}>+ Hardware</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Accessories Specifications */}
                  <Text
                    style={[
                      styles.inputLabel,
                      { fontWeight: "700", marginTop: 6 },
                    ]}
                  >
                    Add Accessories:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                  >
                    {accessoryOptions.map((acc) => {
                      const isActive = accName === acc;
                      const isAddMore = acc === "+ Add More";
                      return (
                        <TouchableOpacity
                          key={acc}
                          style={[
                            styles.roomPill,
                            isActive && styles.roomPillActive,
                            isAddMore &&
                              !isActive && {
                                borderColor: "#7A131A",
                                backgroundColor: "#FFF5F5",
                              },
                          ]}
                          onPress={() => handleSelectAccessory(acc)}
                        >
                          <Text
                            style={[
                              styles.roomPillText,
                              isActive && styles.roomPillTextActive,
                              isAddMore &&
                                !isActive && {
                                  color: "#7A131A",
                                  fontWeight: "700",
                                },
                            ]}
                          >
                            {acc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {showCustomAccessoryInput && (
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}
                    >
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Type custom accessory..."
                        value={customAccessoryName}
                        onChangeText={(val) => {
                          setCustomAccessoryName(val);
                          if (val.trim()) setAccName(val);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.addCustomBtn}
                        onPress={() => handleConfirmCustomAccessory()}
                      >
                        <Text style={styles.addCustomBtnText}>+ Option</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <TextInput
                      style={[styles.textInput, { flex: 2 }]}
                      placeholder="Accessory name (e.g. Wicker basket)"
                      value={accName}
                      onChangeText={setAccName}
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="Qty"
                      keyboardType="numeric"
                      value={accQty}
                      onChangeText={setAccQty}
                    />
                    <TouchableOpacity
                      style={styles.addAccBtn}
                      onPress={handleAddAccessory}
                    >
                      <Ionicons name="add" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  {itemAccessories.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      {itemAccessories.map((a, i) => (
                        <TouchableOpacity
                          key={i}
                          style={{
                            backgroundColor: "#FFF5F5",
                            borderColor: "#FECDD3",
                            borderWidth: 1,
                            borderRadius: 14,
                            paddingVertical: 3,
                            paddingHorizontal: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onPress={() =>
                            setItemAccessories((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#7A131A",
                              fontWeight: "700",
                            }}
                          >
                            {a.name} (x{a.qty}) ✕
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.addItemSubmitBtn}
                    onPress={handleAddItemToRoom}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#ffffff"
                    />
                    <Text style={styles.addItemSubmitText}>
                      Add Item to Scope
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items Added List */}
                <Text style={[styles.formSectionTitle, { marginTop: 24 }]}>
                  Items Added ({items.length})
                </Text>
                {items.length === 0 ? (
                  <Text
                    style={{
                      color: "#94A3B8",
                      fontStyle: "italic",
                      marginBottom: 20,
                    }}
                  >
                    No items added yet. Compose one above.
                  </Text>
                ) : (
                  items.map((it, i) => (
                    <View key={i} style={styles.addedItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addedItemName}>
                          {it.name}{" "}
                          <Text style={{ color: "#7A131A" }}>[{it.room}]</Text>
                        </Text>
                        <Text style={styles.addedItemSub}>
                          {it.quantity} {it.unit} × {formatINR(it.rate)} ={" "}
                          <Text style={styles.boldText}>
                            {formatINR(it.amount)}
                          </Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          setItems((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <TouchableOpacity
                  style={styles.nextStepBtn}
                  onPress={() => setFormStep(3)}
                >
                  <Text style={styles.nextStepBtnText}>
                    Next: Charges, Tax &amp; GST →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: CHARGES, GST & SUMMARY */}
            {formStep === 3 && (
              <View>
                <Text style={styles.formSectionTitle}>
                  Additional Fees &amp; Discounts
                </Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Handling Charges (%)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={handlingPercent}
                      onChangeText={setHandlingPercent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Designing Fees (%)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={designPercent}
                      onChangeText={setDesignPercent}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Discount Type</Text>
                    <View
                      style={{ flexDirection: "row", gap: 6, marginTop: 4 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.smallPill,
                          discountType === "PERCENT" && styles.smallPillActive,
                        ]}
                        onPress={() => setDiscountType("PERCENT")}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            discountType === "PERCENT" &&
                              styles.smallPillTextActive,
                          ]}
                        >
                          %
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.smallPill,
                          discountType === "FIXED" && styles.smallPillActive,
                        ]}
                        onPress={() => setDiscountType("FIXED")}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            discountType === "FIXED" &&
                              styles.smallPillTextActive,
                          ]}
                        >
                          ₹ Fixed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Discount Value</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={discountValue}
                      onChangeText={setDiscountValue}
                    />
                  </View>
                </View>

                {/* GST Configuration Toggle Pills */}
                <Text style={[styles.formSectionTitle, { marginTop: 24 }]}>
                  GST Configuration &amp; Options
                </Text>
                <Text style={styles.inputLabel}>
                  Apply GST Tax on Proposal?
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginVertical: 8 }}
                >
                  <TouchableOpacity
                    style={[
                      styles.roomPill,
                      gstType === "AS_PER_ACTUAL" && styles.roomPillActive,
                    ]}
                    onPress={() => {
                      setGstPercent("18");
                      setGstType("AS_PER_ACTUAL");
                    }}
                  >
                    <Text
                      style={[
                        styles.roomPillText,
                        gstType === "AS_PER_ACTUAL" && styles.roomPillTextActive,
                      ]}
                    >
                      18% (As per actuals)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roomPill,
                      gstType !== "AS_PER_ACTUAL" && parseFloat(gstPercent) === 18 && styles.roomPillActive,
                    ]}
                    onPress={() => {
                      setGstPercent("18");
                      setGstType("CGST_SGST");
                    }}
                  >
                    <Text
                      style={[
                        styles.roomPillText,
                        gstType !== "AS_PER_ACTUAL" && parseFloat(gstPercent) === 18 &&
                          styles.roomPillTextActive,
                      ]}
                    >
                      GST 18% (Calculated in total)
                    </Text>
                  </TouchableOpacity>

                  {[5, 12, 28].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.roomPill,
                        gstType !== "AS_PER_ACTUAL" && parseFloat(gstPercent) === rate &&
                          styles.roomPillActive,
                      ]}
                      onPress={() => {
                        setGstPercent(String(rate));
                        if (gstType === "AS_PER_ACTUAL") setGstType("CGST_SGST");
                      }}
                    >
                      <Text
                        style={[
                          styles.roomPillText,
                          gstType !== "AS_PER_ACTUAL" && parseFloat(gstPercent) === rate &&
                            styles.roomPillTextActive,
                        ]}
                      >
                        GST {rate}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>GST Rate (%)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="18"
                      keyboardType="numeric"
                      value={gstPercent}
                      onChangeText={setGstPercent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>GST Type</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexDirection: "row", marginTop: 4 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.smallPill,
                          gstType === "AS_PER_ACTUAL" && styles.smallPillActive,
                        ]}
                        onPress={() => setGstType("AS_PER_ACTUAL")}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            gstType === "AS_PER_ACTUAL" &&
                              styles.smallPillTextActive,
                          ]}
                        >
                          As Actuals
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.smallPill,
                          gstType === "CGST_SGST" && styles.smallPillActive,
                          { marginLeft: 4 },
                        ]}
                        onPress={() => setGstType("CGST_SGST")}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            gstType === "CGST_SGST" &&
                              styles.smallPillTextActive,
                          ]}
                        >
                          CGST+SGST
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.smallPill,
                          gstType === "IGST" && styles.smallPillActive,
                          { marginLeft: 4 },
                        ]}
                        onPress={() => setGstType("IGST")}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            gstType === "IGST" && styles.smallPillTextActive,
                          ]}
                        >
                          IGST
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>

                {gstType === "AS_PER_ACTUAL" ? (
                  <View
                    style={{
                      backgroundColor: "#FFF5F5",
                      padding: 10,
                      borderRadius: 8,
                      borderColor: "#FECDD3",
                      borderWidth: 1,
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#7A131A",
                        fontWeight: "600",
                      }}
                    >
                      ℹ️ GST 18% will be charged as per actuals and is not included in the estimated total.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#ECFDF5",
                      padding: 10,
                      borderRadius: 8,
                      borderColor: "#A7F3D0",
                      borderWidth: 1,
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#059669",
                        fontWeight: "600",
                      }}
                    >
                      ✓ GST {gstPercent}% is calculated and included in the estimated total.
                    </Text>
                  </View>
                )}

                {/* Live Computed Summary Box */}
                <View
                  style={[
                    styles.sectionBox,
                    {
                      marginTop: 24,
                      backgroundColor: "#FFF5F5",
                      borderColor: "#FECDD3",
                    },
                  ]}
                >
                  <Text style={[styles.boxTitle, { color: "#7A131A" }]}>
                    Live Calculation Summary
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Items Subtotal:</Text>
                    <Text style={styles.priceVal}>
                      {formatINR(liveCalculation.rawSubtotal)}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      Handling Charges ({handlingPercent}%):
                    </Text>
                    <Text style={styles.priceVal}>
                      {formatINR(liveCalculation.handlingFee)}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      Designing Fees ({designPercent}%):
                    </Text>
                    <Text style={styles.priceVal}>
                      {formatINR(liveCalculation.designFee)}
                    </Text>
                  </View>
                  {liveCalculation.discountAmt > 0 && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: "#059669" }]}>
                        Discount:
                      </Text>
                      <Text style={[styles.priceVal, { color: "#059669" }]}>
                        -{formatINR(liveCalculation.discountAmt)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Taxable Total:</Text>
                    <Text style={styles.priceVal}>
                      {formatINR(liveCalculation.taxable)}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      GST ({gstPercent}%{gstType === "AS_PER_ACTUAL" ? " – As per Actuals" : ""}):
                    </Text>
                    <Text style={styles.priceVal}>
                      {gstType === "AS_PER_ACTUAL"
                        ? "18% – As per Actuals (Not included)"
                        : formatINR(liveCalculation.gstAmt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.priceRow,
                      styles.grandTotalRow,
                      { marginTop: 8 },
                    ]}
                  >
                    <Text style={styles.grandTotalLabel}>
                      Estimated Grand Total:
                    </Text>
                    <Text style={styles.grandTotalVal}>
                      {formatINR(liveCalculation.grandTotal)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.nextStepBtn}
                  onPress={() => setFormStep(4)}
                >
                  <Text style={styles.nextStepBtnText}>
                    Next: Milestones &amp; Notes →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 4: MILESTONES & FINALIZE */}
            {formStep === 4 && (
              <View>
                <Text style={styles.formSectionTitle}>
                  Payment Milestones Schedule
                </Text>
                <View
                  style={[
                    styles.msSumBanner,
                    liveCalculation.isMilestonesValid
                      ? styles.msValid
                      : styles.msInvalid,
                  ]}
                >
                  <Text
                    style={[
                      styles.msBannerText,
                      {
                        color: liveCalculation.isMilestonesValid
                          ? "#065F46"
                          : "#991B1B",
                      },
                    ]}
                  >
                    Total Share: {liveCalculation.totalMilestonePct}%{" "}
                    {liveCalculation.isMilestonesValid
                      ? "✓ Valid (100%)"
                      : "⚠️ Must equal 100%"}
                  </Text>
                </View>

                {milestones.map((m, idx) => (
                  <View key={idx} style={styles.milestoneInputCard}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <TextInput
                        style={[
                          styles.textInput,
                          { flex: 2, marginRight: 8, fontWeight: "700" },
                        ]}
                        value={m.milestoneName}
                        onChangeText={(name) => {
                          const updated = [...milestones];
                          updated[idx].milestoneName = name;
                          setMilestones(updated);
                        }}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              width: 50,
                              textAlign: "center",
                              fontWeight: "800",
                            },
                          ]}
                          keyboardType="numeric"
                          value={String(m.percentage)}
                          onChangeText={(val) => {
                            const updated = [...milestones];
                            updated[idx].percentage = parseFloat(val) || 0;
                            setMilestones(updated);
                          }}
                        />
                        <Text style={{ marginLeft: 4, fontWeight: "700" }}>
                          %
                        </Text>
                      </View>
                    </View>
                    <TextInput
                      style={[styles.textInput, { marginTop: 6, fontSize: 11 }]}
                      placeholder="Stage description"
                      value={m.stage}
                      onChangeText={(st) => {
                        const updated = [...milestones];
                        updated[idx].stage = st;
                        setMilestones(updated);
                      }}
                    />
                  </View>
                ))}

                <Text style={[styles.formSectionTitle, { marginTop: 24 }]}>
                  Internal Notes (Optional)
                </Text>
                <TextInput
                  style={[styles.textInput, { height: 70 }]}
                  placeholder="Additional customer requirements or architectural notes..."
                  multiline
                  value={quotationNotes}
                  onChangeText={setQuotationNotes}
                />

                <TouchableOpacity
                  style={[
                    styles.nextStepBtn,
                    { backgroundColor: "#7A131A", marginTop: 24 },
                  ]}
                  onPress={handleSaveQuotation}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.nextStepBtnText}>
                      ✓ Save &amp; Generate Quotation
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── EMAIL MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        visible={isEmailModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEmailModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.emailCardModal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Email Quotation PDF</Text>
              <TouchableOpacity
                onPress={() => setIsEmailModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 18 }}>
              <Text style={styles.inputLabel}>Recipient Email *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="email-address"
                value={emailRecipient}
                onChangeText={setEmailRecipient}
              />

              <Text style={styles.inputLabel}>CC Email (Optional)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="email-address"
                placeholder="e.g. architect@example.com"
                value={emailCc}
                onChangeText={setEmailCc}
              />

              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.textInput}
                value={emailSubject}
                onChangeText={setEmailSubject}
              />

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, { height: 90 }]}
                multiline
                value={emailMessage}
                onChangeText={setEmailMessage}
              />

              <View style={styles.attachBox}>
                <Ionicons name="attach" size={18} color="#7A131A" />
                <Text style={styles.attachText}>
                  Attachment: Quotation_{selectedQuotation?.quotationNumber}.pdf
                  (Automatically generated)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginTop: 16 }]}
                onPress={handleSendEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#ffffff" />
                    <Text style={styles.primaryActionBtnText}>
                      Dispatch Email to Client
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ADD TRANSACTION MODAL ──────────────────────────────────────────────── */}
      <Modal
        visible={isAddTxnModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddTxnModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.emailCardModal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Record Quotation Payment</Text>
              <TouchableOpacity
                onPress={() => setIsAddTxnModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 18 }}>
              <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                Quotation: <Text style={{ fontWeight: "700", color: "#0F172A" }}>#{selectedQuotation?.quotationNumber}</Text> ({selectedQuotation?.client?.name})
              </Text>

              {selectedQuotation?.paymentSummary && (
                <View style={{ backgroundColor: "#F8FAFC", padding: 10, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0" }}>
                  <Text style={{ fontSize: 11, color: "#64748B" }}>
                    Grand Total: <Text style={{ fontWeight: "700", color: "#0F172A" }}>{formatINR(selectedQuotation.paymentSummary.totalAmount)}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>
                    Paid So Far: <Text style={{ fontWeight: "700" }}>{formatINR(selectedQuotation.paymentSummary.paidAmount)}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>
                    Remaining Balance: <Text style={{ fontWeight: "700" }}>{formatINR(selectedQuotation.paymentSummary.remainingAmount)}</Text>
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Payment Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                value={txnAmount}
                onChangeText={setTxnAmount}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Payment Method *</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6 }}>
                {["UPI", "Bank Transfer", "Cash", "Cheque", "Card"].map((method) => {
                  const isActive = txnPaymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.smallPill, isActive && styles.smallPillActive]}
                      onPress={() => setTxnPaymentMethod(method)}
                    >
                      <Text style={[styles.smallPillText, isActive && styles.smallPillTextActive]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Reference / Transaction ID (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. UTR / Cheque No / Txn Ref"
                value={txnReferenceId}
                onChangeText={setTxnReferenceId}
              />

              <Text style={styles.inputLabel}>Notes / Remarks (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                placeholder="e.g. Advance 10% token payment received"
                value={txnNotes}
                onChangeText={setTxnNotes}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginTop: 16, backgroundColor: "#059669" }]}
                onPress={handleAddTxnSubmit}
                disabled={isSubmittingTxn}
              >
                {isSubmittingTxn ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.primaryActionBtnText}>
                      Save & Sync Transaction
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header
  header: {
    backgroundColor: "#7A131A",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 9.5,
    color: "#FECDD3",
    fontWeight: "600",
    marginTop: 0,
  },
  newQuoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 3,
  },
  newQuoteText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7A131A",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#1E293B",
    paddingVertical: 0,
  },

  // KPIs
  kpiScroll: {
    maxHeight: 78,
    marginTop: 6,
  },
  kpiContainer: {
    paddingHorizontal: 14,
    gap: 8,
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 130,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  kpiVal: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  kpiCount: {
    fontSize: 9.5,
    color: "#94A3B8",
    marginTop: 1,
  },

  // Status Filter Pills
  pillsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillActive: {
    backgroundColor: "#7A131A",
    borderColor: "#7A131A",
  },
  pillText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  // List
  listScroll: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  centerBox: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 13 },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 18,
    backgroundColor: "#7A131A",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },

  // Quotation Card
  quoteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quoteNoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quoteNo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7A131A",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  revBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  revText: { fontSize: 9, fontWeight: "800", color: "#475569" },
  projectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 3,
  },
  clientName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  grandTotalText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 4,
  },

  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  statusTagApproved: { backgroundColor: "#DCFCE7" },
  statusTagSent: { backgroundColor: "#E0E7FF" },
  statusTagDraft: { backgroundColor: "#FEF3C7" },
  statusTagRejected: { backgroundColor: "#FEE2E2" },
  statusTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusTextApproved: { color: "#166534" },
  statusTextSent: { color: "#3730A3" },
  statusTextDraft: { color: "#92400E" },
  statusTextRejected: { color: "#991B1B" },

  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateVal: {
    fontSize: 10.5,
    color: "#64748B",
  },
  actionPills: {
    flexDirection: "row",
    gap: 6,
  },
  quickIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailCardModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  emailCardModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7A131A",
  },
  modalSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    maxHeight: 520,
  },

  // Section Box
  sectionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  boxText: {
    fontSize: 11,
    color: "#334155",
    marginBottom: 3,
    lineHeight: 16,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  priceLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  priceVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7A131A",
  },
  grandTotalVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#7A131A",
  },
  wordsText: {
    fontSize: 10,
    color: "#9F1239",
    fontStyle: "italic",
    marginTop: 6,
  },

  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemCardRoom: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7A131A",
  },
  itemCardAmt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  itemCardName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },
  itemCardQty: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  itemCardSpecs: {
    fontSize: 9.5,
    color: "#475569",
    marginTop: 3,
  },
  itemCardAcc: {
    fontSize: 9.5,
    color: "#D97706",
    marginTop: 2,
  },

  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  msName: { fontSize: 11, fontWeight: "700", color: "#1E293B" },
  msStage: { fontSize: 9.5, color: "#64748B" },
  msPct: { fontSize: 11, fontWeight: "800", color: "#7A131A" },
  msAmt: { fontSize: 10.5, fontWeight: "600", color: "#334155" },

  actionButtonsCol: {
    gap: 8,
    marginTop: 10,
    marginBottom: 24,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7A131A",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  secondaryActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7A131A",
  },
  editActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  editActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  convertBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  convertBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  // Creator Modal
  creatorRoot: { flex: 1, backgroundColor: "#ffffff" },
  creatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  creatorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  saveHeaderBtn: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveHeaderText: {
    color: "#7A131A",
    fontWeight: "800",
    fontSize: 12,
  },
  stepTabs: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  stepTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  stepTabActive: {
    borderBottomColor: "#7A131A",
  },
  stepTabNum: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
  },
  stepTabNumActive: {
    color: "#7A131A",
  },
  stepTabLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  stepTabLabelActive: {
    color: "#7A131A",
    fontWeight: "700",
  },

  formSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0F172A",
  },
  nextStepBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  nextStepBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },

  roomPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  roomPillActive: {
    backgroundColor: "#7A131A",
  },
  roomPillText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  roomPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  itemComposerCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  composerHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7A131A",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  addAccBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#7A131A",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addItemSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7A131A",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 6,
  },
  addItemSubmitText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  addedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  addedItemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  addedItemSub: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },

  smallPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  smallPillActive: {
    backgroundColor: "#7A131A",
  },
  smallPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  smallPillTextActive: {
    color: "#ffffff",
  },

  msSumBanner: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: "center",
  },
  msValid: { backgroundColor: "#D1FAE5" },
  msInvalid: { backgroundColor: "#FEE2E2" },
  msBannerText: { fontSize: 11, fontWeight: "800" },

  milestoneInputCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },

  attachBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  attachText: {
    fontSize: 11,
    color: "#7A131A",
    fontWeight: "600",
    flex: 1,
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  customRoomInputCard: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7A131A",
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  addCustomBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});

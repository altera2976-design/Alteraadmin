import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
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
import { API_URL } from "../../constants/config";
import { getSocket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import {
  quotationApi,
  QuotationDoc,
  QuotationItemDoc,
  QuotationMilestone,
  QuotationStandaloneAccessory,
  QuotationSummaryKpis,
} from "../../services/quotationApi";
import {
  downloadPdf,
  generatePdf,
  sharePdf,
} from "../../services/quotationPdf";
import {
  PREDEFINED_ACCESSORIES,
  PredefinedAccessory,
  resolveAccessoryImageUri,
} from "../../constants/predefinedAccessories";

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

const DEFAULT_ACCESSORY_PRICES: Record<string, number> = {
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
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  // Step 3: Standalone Accessories
  const [standaloneAccessories, setStandaloneAccessories] = useState<
    QuotationStandaloneAccessory[]
  >([]);
  const [stAccName, setStAccName] = useState("");
  const [stAccDesc, setStAccDesc] = useState("");
  const [stAccImage, setStAccImage] = useState("");
  const [stAccImages, setStAccImages] = useState<string[]>([]);
  const [stAccImageId, setStAccImageId] = useState("");
  const [stAccQty, setStAccQty] = useState("1");
  const [stAccUnit, setStAccUnit] = useState("Pcs");
  const [stAccPrice, setStAccPrice] = useState("");
  const [editingAccIndex, setEditingAccIndex] = useState<number | null>(null);

  // Catalog & Predefined Gallery
  const [showAccGalleryModal, setShowAccGalleryModal] = useState(false);
  const [accGallerySearch, setAccGallerySearch] = useState("");
  const [accGalleryCategory, setAccGalleryCategory] = useState("All");
  const [catalogAccessories, setCatalogAccessories] = useState<
    PredefinedAccessory[]
  >(PREDEFINED_ACCESSORIES);
  const [modalSelectedItems, setModalSelectedItems] = useState<
    PredefinedAccessory[]
  >([]);
  const [showAddCustomModalItem, setShowAddCustomModalItem] = useState(false);
  const [customModalItemName, setCustomModalItemName] = useState("");
  const [customModalItemCategory, setCustomModalItemCategory] = useState(
    "Kitchen Accessories",
  );
  const [customModalItemImage, setCustomModalItemImage] = useState("");
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

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

  const [stAccessoryOptions, setStAccessoryOptions] = useState<string[]>(
    DEFAULT_STANDALONE_ACCESSORY_OPTIONS,
  );
  const [showStAccCustomAccessory, setShowStAccCustomAccessory] =
    useState(false);
  const [stAccCustomAccessory, setStAccCustomAccessory] = useState("");

  const [stAccHardwareOptions, setStAccHardwareOptions] = useState<string[]>(
    DEFAULT_STANDALONE_HARDWARE_OPTIONS,
  );
  const [showStAccCustomHardware, setShowStAccCustomHardware] = useState(false);
  const [stAccCustomHardware, setStAccCustomHardware] = useState("");

  const handlePickAccImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        setStAccImages((prev) => {
          const combined = [...prev, ...newUris];
          setStAccImage(combined[0] || "");
          return combined;
        });
        setStAccImageId("");
      }
    } catch (error) {
      Alert.alert("Image Error", "Could not pick image.");
    }
  };

  const handleRemoveSingleAccFormImage = (indexToRemove: number) => {
    setStAccImages((prev) => {
      const current = prev.length > 0 ? prev : stAccImage ? [stAccImage] : [];
      const updated = current.filter((_, i) => i !== indexToRemove);
      setStAccImage(updated[0] || "");
      if (updated.length === 0) setStAccImageId("");
      return updated;
    });
  };

  const handleClearAllAccFormImages = () => {
    setStAccImage("");
    setStAccImages([]);
    setStAccImageId("");
  };

  const handleOpenGalleryModal = () => {
    const currentImgs =
      stAccImages.length > 0
        ? stAccImages
        : stAccImage
          ? [stAccImage]
          : [];
    const preselected: PredefinedAccessory[] = [];
    currentImgs.forEach((imgSrc) => {
      const foundInCatalog = catalogAccessories.find((c) => c.image === imgSrc);
      if (foundInCatalog) {
        if (!preselected.some((p) => p.id === foundInCatalog.id)) {
          preselected.push(foundInCatalog);
        }
      } else {
        const foundInPredefined = PREDEFINED_ACCESSORIES.find(
          (p) => p.image === imgSrc,
        );
        if (foundInPredefined) {
          if (!preselected.some((p) => p.id === foundInPredefined.id)) {
            preselected.push(foundInPredefined);
          }
        } else {
          preselected.push({
            id: `uploaded-img-${imgSrc.slice(-12)}`,
            name: "Uploaded Photo",
            category: "Custom Upload",
            image: imgSrc,
          });
        }
      }
    });
    setModalSelectedItems(preselected);
    setShowAccGalleryModal(true);
  };

  const handleToggleModalItemSelect = (item: PredefinedAccessory) => {
    setModalSelectedItems((prev) => {
      const exists = prev.some(
        (it) => it.id === item.id || it.image === item.image,
      );
      if (exists) {
        return prev.filter(
          (it) => it.id !== item.id && it.image !== item.image,
        );
      } else {
        return [...prev, item];
      }
    });
  };

  const handleDeleteCustomCatalogItem = (itemId: string) => {
    Alert.alert(
      "Delete Custom Item",
      "Do you want to delete this custom hardware accessory from catalog?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setCatalogAccessories((prev) =>
              prev.filter((it) => it.id !== itemId),
            );
            setModalSelectedItems((prev) =>
              prev.filter((it) => it.id !== itemId),
            );
          },
        },
      ],
    );
  };

  const handleApplyModalSelection = () => {
    const selectedPhotos = modalSelectedItems
      .map((it) => it.image)
      .filter(Boolean);
    setStAccImages(selectedPhotos);
    setStAccImage(selectedPhotos[0] || "");
    setStAccImageId(modalSelectedItems[0]?.id || "");
    if (!stAccName.trim() && modalSelectedItems.length === 1) {
      setStAccName(modalSelectedItems[0].name);
    }
    setShowAccGalleryModal(false);
  };

  const handleBatchAddModalItems = () => {
    if (modalSelectedItems.length === 0) return;
    const newRows: QuotationStandaloneAccessory[] = modalSelectedItems.map(
      (item) => ({
        name: item.name,
        description: item.category,
        image: item.image,
        images: [item.image],
        imageId: item.id || "",
        quantity: 1,
        unit: "Pcs",
        price: 0,
        total: 0,
      }),
    );
    setStandaloneAccessories((prev) => [...prev, ...newRows]);
    setModalSelectedItems([]);
    setShowAccGalleryModal(false);
  };

  const handlePickCustomModalItemImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCustomModalItemImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Image Error", "Could not pick image.");
    }
  };

  const handleSaveCustomModalItem = () => {
    if (!customModalItemName.trim()) {
      Alert.alert("Validation", "Please enter a name for the accessory.");
      return;
    }
    if (!customModalItemImage) {
      Alert.alert("Validation", "Please select an image for the accessory.");
      return;
    }
    const newItem: PredefinedAccessory = {
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

  const handleSelectStAccessory = (cat: string) => {
    if (cat === "+ Add More") {
      setShowStAccCustomAccessory(true);
      return;
    }
    setShowStAccCustomAccessory(false);
    setStAccName(cat);
  };

  const handleConfirmCustomStAccAccessory = async (overrideName?: string) => {
    const raw =
      typeof overrideName === "string" ? overrideName : stAccCustomAccessory;
    const trimmed = (raw || "").trim();
    if (!trimmed) return;

    if (!stAccessoryOptions.includes(trimmed)) {
      setStAccessoryOptions((prev) => {
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

    setStAccName(trimmed);
    setStAccCustomAccessory("");
    setShowStAccCustomAccessory(false);

    try {
      await quotationApi.addConfigOption("standaloneAccessory", trimmed);
    } catch (err) {
      console.warn("Failed to save custom accessory to config:", err);
    }
  };

  const handleSelectStAccHardware = (opt: string) => {
    if (opt === "+ Add More") {
      setShowStAccCustomHardware(true);
      return;
    }
    setShowStAccCustomHardware(false);
    setStAccDesc(opt);
  };

  const handleConfirmCustomStAccHardware = async (overrideName?: string) => {
    const raw =
      typeof overrideName === "string" ? overrideName : stAccCustomHardware;
    const trimmed = (raw || "").trim();
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

    setStAccDesc(trimmed);
    setStAccCustomHardware("");
    setShowStAccCustomHardware(false);

    try {
      await quotationApi.addConfigOption("standaloneHardware", trimmed);
    } catch (err) {
      console.warn("Failed to save custom hardware to config:", err);
    }
  };

  const handleAddOrUpdateStandaloneAccessory = () => {
    const name = stAccName.trim();
    if (!name) {
      Alert.alert("Validation Error", "Please enter accessory name.");
      return;
    }
    const qty = Math.max(1, parseInt(stAccQty, 10) || 1);
    const price = Math.max(0, parseFloat(stAccPrice) || 0);
    const total = Math.round(qty * price);

    const finalHardware = showStAccCustomHardware
      ? stAccCustomHardware.trim()
      : stAccDesc.trim();
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
      quotationApi
        .addConfigOption("standaloneHardware", finalHardware)
        .catch(console.warn);
    }

    if (showStAccCustomAccessory && name && !stAccessoryOptions.includes(name)) {
      setStAccessoryOptions((prev) => {
        const copy = [...prev];
        copy.splice(copy.length - 1, 0, name);
        return copy;
      });
      quotationApi
        .addConfigOption("standaloneAccessory", name)
        .catch(console.warn);
    }

    const finalImages =
      stAccImages && stAccImages.length > 0
        ? stAccImages
        : stAccImage
          ? [stAccImage]
          : [];

    const newAcc: QuotationStandaloneAccessory = {
      name,
      description: finalHardware,
      image: finalImages[0] || undefined,
      images: finalImages,
      imageId: stAccImageId || undefined,
      quantity: qty,
      unit: stAccUnit.trim() || "Pcs",
      price,
      total,
    };

    if (editingAccIndex !== null && editingAccIndex >= 0) {
      const updated = [...standaloneAccessories];
      updated[editingAccIndex] = newAcc;
      setStandaloneAccessories(updated);
      setEditingAccIndex(null);
    } else {
      setStandaloneAccessories((prev) => [...prev, newAcc]);
    }

    setStAccName("");
    setShowStAccCustomAccessory(false);
    setStAccCustomAccessory("");
    setStAccDesc("");
    setShowStAccCustomHardware(false);
    setStAccCustomHardware("");
    setStAccImage("");
    setStAccImages([]);
    setStAccImageId("");
    setStAccQty("1");
    setStAccUnit("Pcs");
    setStAccPrice("");
  };

  const handleEditStandaloneAccessory = (index: number) => {
    const acc = standaloneAccessories[index];
    if (!acc) return;
    setStAccName(acc.name || "");
    const desc = acc.description || "";
    if (stAccHardwareOptions.includes(desc)) {
      setStAccDesc(desc);
      setShowStAccCustomHardware(false);
    } else {
      setStAccDesc("+ Add More");
      setShowStAccCustomHardware(true);
      setStAccCustomHardware(desc);
    }
    const accImgs =
      Array.isArray(acc.images) && acc.images.length > 0
        ? acc.images
        : acc.image
          ? [acc.image]
          : [];
    setStAccImage(accImgs[0] || "");
    setStAccImages(accImgs);
    setStAccImageId(acc.imageId || "");
    setStAccQty(String(acc.quantity || 1));
    setStAccUnit(acc.unit || "Pcs");
    setStAccPrice(String(acc.price || 0));
    setEditingAccIndex(index);
  };

  const handleCancelEditStandaloneAccessory = () => {
    setEditingAccIndex(null);
    setStAccName("");
    setShowStAccCustomAccessory(false);
    setStAccCustomAccessory("");
    setStAccDesc("");
    setShowStAccCustomHardware(false);
    setStAccCustomHardware("");
    setStAccImage("");
    setStAccImages([]);
    setStAccImageId("");
    setStAccQty("1");
    setStAccUnit("Pcs");
    setStAccPrice("");
  };

  const handleRemoveStandaloneAccessory = (index: number) => {
    Alert.alert(
      "Delete Accessory",
      "Are you sure you want to remove this accessory from the quotation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setStandaloneAccessories((prev) =>
              prev.filter((_, i) => i !== index),
            );
            if (editingAccIndex === index) {
              handleCancelEditStandaloneAccessory();
            }
          },
        },
      ],
    );
  };

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
  const [accUnitPrice, setAccUnitPrice] = useState("1500");
  const [accQty, setAccQty] = useState("1");
  const [accInclusion, setAccInclusion] = useState<
    "INCLUDED" | "EXCLUDED" | "LUMP_SUM" | "ACTUAL_COST"
  >("INCLUDED");
  const [itemAccessories, setItemAccessories] = useState<
    Array<{
      name: string;
      qty: number;
      unitPrice?: number;
      inclusionType: any;
      cost: number;
    }>
  >([]);
  const [itemRemarks, setItemRemarks] = useState("");

  // Step 4: Charges, GST, Discount
  const [handlingPercent, setHandlingPercent] = useState("2");
  const [designPercent, setDesignPercent] = useState("2");
  const [transportCharges, setTransportCharges] = useState("0");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [gstType, setGstType] = useState<
    "AS_PER_ACTUAL" | "CGST_SGST" | "IGST"
  >("AS_PER_ACTUAL");

  // Step 5: Milestones & Notes
  const [milestones, setMilestones] = useState<QuotationMilestone[]>(
    DEFAULT_MILESTONES_INPUT,
  );
  const [quotationNotes, setQuotationNotes] = useState("");

  // ── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [listRes, sumRes, configRes] = await Promise.all([
        quotationApi.getQuotations({
          status: activeStatus !== "ALL" ? activeStatus : undefined,
          search: searchQuery.trim() ? searchQuery.trim() : undefined,
        }),
        quotationApi.getSummary(),
        quotationApi.getConfig().catch(() => null),
      ]);

      if (listRes?.success) {
        setQuotations(listRes.quotations || []);
      }
      if (sumRes?.success) {
        setSummary(sumRes.summary || null);
      }
      if (configRes?.success && configRes.data) {
        if (
          Array.isArray(configRes.data.standaloneAccessoryOptions) &&
          configRes.data.standaloneAccessoryOptions.length > 0
        ) {
          const accs = [...configRes.data.standaloneAccessoryOptions];
          if (!accs.includes("+ Add More")) accs.push("+ Add More");
          setStAccessoryOptions(accs);
        }
        if (
          Array.isArray(configRes.data.standaloneHardwareOptions) &&
          configRes.data.standaloneHardwareOptions.length > 0
        ) {
          const hw = [...configRes.data.standaloneHardwareOptions];
          if (!hw.includes("+ Add More")) hw.push("+ Add More");
          setStAccHardwareOptions(hw);
        }
      }
    } catch (error) {
      console.error("Error loading quotations:", error);
    }
  }, [activeStatus, searchQuery]);

  // Real-time synchronization of quotation config with web admin panel
  useEffect(() => {
    let socket: any;
    try {
      socket = getSocket();
      if (socket) {
        const handleConfigUpdated = (newConfig: any) => {
          if (!newConfig) return;
          if (
            Array.isArray(newConfig.standaloneAccessoryOptions) &&
            newConfig.standaloneAccessoryOptions.length > 0
          ) {
            const accs = [...newConfig.standaloneAccessoryOptions];
            if (!accs.includes("+ Add More")) accs.push("+ Add More");
            setStAccessoryOptions(accs);
          }
          if (
            Array.isArray(newConfig.standaloneHardwareOptions) &&
            newConfig.standaloneHardwareOptions.length > 0
          ) {
            const hw = [...newConfig.standaloneHardwareOptions];
            if (!hw.includes("+ Add More")) hw.push("+ Add More");
            setStAccHardwareOptions(hw);
          }
        };

        socket.on("quotation_config_updated", handleConfigUpdated);
        return () => {
          socket.off("quotation_config_updated", handleConfigUpdated);
        };
      }
    } catch (err) {
      console.warn("Socket sync error in QuotationScreen:", err);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    
    const frameId = requestAnimationFrame(() => {
      loadData().finally(() => setIsLoading(false));
    });

    return () => cancelAnimationFrame(frameId);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // ── Live Calculation for Modal Form ────────────────────────────────────────
  const liveCalculation = useMemo(() => {
    const addedSub = items.reduce((acc, it) => {
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

    const standaloneAccTotal = standaloneAccessories.reduce(
      (sum, a) =>
        sum +
        (Number(a.total) || (Number(a.quantity) || 1) * (Number(a.price) || 0)),
      0,
    );

    const rawSubtotal = addedSub + currentDraftAmt + standaloneAccTotal;
    const handlingFee = Math.round(
      rawSubtotal * ((parseFloat(handlingPercent) || 0) / 100),
    );
    const designFee = Math.round(
      rawSubtotal * ((parseFloat(designPercent) || 0) / 100),
    );
    const transportAmt = Math.max(0, parseFloat(transportCharges) || 0);

    const discVal = parseFloat(discountValue) || 0;
    const discountAmt =
      discountType === "PERCENT"
        ? Math.round(rawSubtotal * (discVal / 100))
        : Math.min(rawSubtotal, discVal);

    const taxable = Math.max(
      0,
      rawSubtotal + handlingFee + designFee + transportAmt - discountAmt,
    );
    const gstPct = parseFloat(gstPercent) || 0;
    const gstAmt =
      gstType === "AS_PER_ACTUAL" ? 0 : Math.round(taxable * (gstPct / 100));
    const grandTotal = taxable + gstAmt;

    const totalMilestonePct = milestones.reduce(
      (acc, m) => acc + (Number(m.percentage) || 0),
      0,
    );
    const isMilestonesValid = Math.abs(totalMilestonePct - 100) < 0.5;

    return {
      rawSubtotal,
      addedSub,
      currentDraftAmt,
      standaloneAccTotal,
      handlingFee,
      designFee,
      transportAmt,
      discountAmt,
      taxable,
      gstAmt,
      grandTotal,
      totalMilestonePct,
      isMilestonesValid,
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
    const price = DEFAULT_ACCESSORY_PRICES[acc] || 1500;
    setAccUnitPrice(String(price));
    setAccQty("1");
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
    setItemAccessories((prev) => [
      ...prev,
      { name: trimmed, qty, unitPrice, inclusionType: "INCLUDED", cost },
    ]);
    setAccName("");
    setAccUnitPrice("1500");
    setAccQty("1");
  };

  const handleAddAccessoryToScope = () => {
    const trimmed = accName.trim();
    if (!trimmed) {
      Alert.alert(
        "Validation Error",
        "Please select or enter an accessory name.",
      );
      return;
    }
    const qty = Math.max(1, parseInt(accQty, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(accUnitPrice) || 0);
    const cost = Math.round(qty * unitPrice);

    const newItem: QuotationItemDoc = {
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
    };

    setItems((prev) => [...prev, newItem]);
    setAccName("");
    setAccUnitPrice("1500");
    setAccQty("1");
    Alert.alert("Accessory Added", `"${trimmed}" added to ${selectedRoom}`);
  };

  const handleUpdateAccessoryQty = (index: number, newQty: string) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    setItemAccessories((prev) => {
      const updated = [...prev];
      const acc = updated[index];
      acc.qty = qty;
      acc.cost = Math.round(qty * (acc.unitPrice || 0));
      return updated;
    });
  };

  const handleUpdateItemQty = (index: number, newQty: string) => {
    const qty = Math.max(0.01, parseFloat(newQty) || 0);
    setItems((prev) => {
      const updated = [...prev];
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
      return updated;
    });
  };

  const handleUpdateItemRate = (index: number, newRate: string) => {
    const rate = Math.max(0, parseFloat(newRate) || 0);
    setItems((prev) => {
      const updated = [...prev];
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
      return updated;
    });
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
      setTransportCharges(String(existing.pricing?.transportCharges || 0));
      setDiscountType(existing.pricing?.discountType || "PERCENT");
      setDiscountValue(String(existing.pricing?.discountValue || 0));
      setGstPercent(String(existing.pricing?.gstPercent || 18));
      setGstType(existing.pricing?.gstType || "AS_PER_ACTUAL");
      setStandaloneAccessories(existing.standaloneAccessories || []);
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
      setTransportCharges("0");
      setDiscountType("PERCENT");
      setDiscountValue("0");
      setGstPercent("18");
      setGstType("AS_PER_ACTUAL");
      setStandaloneAccessories([]);
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
    let currentItems = [...items];
    if (currentItems.length === 0 && liveCalculation.currentDraftAmt > 0) {
      const sizeNum =
        parseFloat(itemSize) > 0 ? parseFloat(itemSize) : itemRate ? 1 : 0;
      const rateNum = parseFloat(itemRate) || 0;
      const baseAmt = Math.round(sizeNum * rateNum);
      const accTotalAmt = itemAccessories.reduce(
        (sum, acc) =>
          sum +
          (acc.cost !== undefined
            ? acc.cost
            : (acc.qty || 1) * (acc.unitPrice || 0)),
        0,
      );
      const autoItem: QuotationItemDoc = {
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
      };
      currentItems = [autoItem];
      setItems(currentItems);
    }
    if (currentItems.length === 0 && standaloneAccessories.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please add at least one quotation work item or accessory.",
      );
      setFormStep(2);
      return;
    }
    if (!liveCalculation.isMilestonesValid) {
      Alert.alert(
        "Validation Error",
        `Milestone percentages must equal 100%. Currently: ${liveCalculation.totalMilestonePct}%`,
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

      // File size validation and processing for local uploaded files
      for (let i = 0; i < updatedStandaloneAccessories.length; i++) {
        const acc = updatedStandaloneAccessories[i];
        const isLocalFile =
          acc.image &&
          !acc.image.startsWith("http") &&
          !acc.image.startsWith("/") &&
          !acc.image.startsWith("data:");
        if (isLocalFile) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(acc.image!);
            if (fileInfo.exists && fileInfo.size > MAX_SIZE) {
              Alert.alert(
                "File Too Large",
                `The image for accessory "${acc.name}" exceeds the maximum allowed size of 50MB.`,
              );
              setIsActionLoading(false);
              return;
            }
            if (fileInfo.exists) {
              hasFiles = true;
              const filename =
                acc.image!.split("/").pop() || `image_${i}.jpg`;
              formData.append("images", {
                uri: acc.image,
                name: `idx_${i}_${filename}`,
                type: "image/jpeg",
              } as any);

              // Clear out local URI from JSON payload, backend will fill in uploaded path
              updatedStandaloneAccessories[i].image = "";
            }
          } catch (e) {
            console.log("Error checking file size", e);
          }
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

      let finalPayload: any = payloadObj;
      if (hasFiles) {
        formData.append("data", JSON.stringify(payloadObj));
        finalPayload = formData;
      }

      if (editingQuotationId) {
        const res = await quotationApi.updateQuotation(
          editingQuotationId,
          finalPayload,
        );
        if (res?.success) {
          Alert.alert("Quotation Updated", res.message);
          setIsCreateModalOpen(false);
          loadData();
        }
      } else {
        const res = await quotationApi.createQuotation(finalPayload);
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

          <View style={[styles.kpiCard, { borderLeftColor: "#7A131A" }]}>
            <Text style={styles.kpiLabel}>Approved / Converted</Text>
            <Text style={[styles.kpiVal, { color: "#7A131A" }]}>
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
        keyboardShouldPersistTaps="handled"
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
                  contentContainerStyle={{ padding: 12 }}
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
                    {selectedQuotation.standaloneAccessories &&
                      selectedQuotation.standaloneAccessories.length > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>
                            Accessories Total:
                          </Text>
                          <Text style={styles.priceVal}>
                            {formatINR(
                              selectedQuotation.pricing?.accessoriesTotal ||
                              selectedQuotation.standaloneAccessories.reduce(
                                (s, a) =>
                                  s + (a.total || a.quantity * a.price),
                                0,
                              ),
                            )}
                          </Text>
                        </View>
                      )}
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
                    {(selectedQuotation.pricing?.transportCharges || 0) > 0 && (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>
                          Transportation Charges:
                        </Text>
                        <Text style={styles.priceVal}>
                          {formatINR(
                            selectedQuotation.pricing?.transportCharges,
                          )}
                        </Text>
                      </View>
                    )}
                    {(selectedQuotation.pricing?.discountAmount || 0) > 0 && (
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: "#7A131A" }]}>
                          Special Discount:
                        </Text>
                        <Text style={[styles.priceVal, { color: "#7A131A" }]}>
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
                  <View
                    style={[
                      styles.sectionBox,
                      { backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Text style={styles.boxTitle}>
                        Payment &amp; Transactions
                      </Text>
                      <View
                        style={[
                          styles.statusTag,
                          selectedQuotation.paymentSummary?.paymentStatus ===
                            "PAID"
                            ? styles.statusTagApproved
                            : selectedQuotation.paymentSummary
                              ?.paymentStatus === "PARTIALLY_PAID"
                              ? styles.statusTagSent
                              : styles.statusTagRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            selectedQuotation.paymentSummary?.paymentStatus ===
                              "PAID"
                              ? styles.statusTextApproved
                              : selectedQuotation.paymentSummary
                                ?.paymentStatus === "PARTIALLY_PAID"
                                ? styles.statusTextSent
                                : styles.statusTextRejected,
                          ]}
                        >
                          {(
                            selectedQuotation.paymentSummary?.paymentStatus ||
                            "UNPAID"
                          ).replace("_", " ")}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={styles.priceLabel}>
                        Quotation Grand Total:
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(
                          selectedQuotation.paymentSummary?.totalAmount ||
                          selectedQuotation.pricing?.grandTotal,
                        )}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={[styles.priceLabel, { color: "#7A131A" }]}>
                        Total Amount Paid:
                      </Text>
                      <Text
                        style={[
                          styles.priceVal,
                          { color: "#7A131A", fontWeight: "800" },
                        ]}
                      >
                        {formatINR(
                          selectedQuotation.paymentSummary?.paidAmount || 0,
                        )}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <Text style={[styles.priceLabel, { color: "#DC2626" }]}>
                        Balance Remaining:
                      </Text>
                      <Text
                        style={[
                          styles.priceVal,
                          { color: "#DC2626", fontWeight: "800" },
                        ]}
                      >
                        {formatINR(
                          selectedQuotation.paymentSummary?.remainingAmount ??
                          (selectedQuotation.pricing?.grandTotal || 0),
                        )}
                      </Text>
                    </View>

                    {/* Record Payment Button */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#7A131A",
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        marginBottom: 12,
                      }}
                      onPress={() => {
                        setTxnAmount(
                          String(
                            selectedQuotation.paymentSummary?.remainingAmount ||
                            selectedQuotation.pricing?.grandTotal ||
                            "",
                          ),
                        );
                        setIsAddTxnModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Record Payment / Transaction
                      </Text>
                    </TouchableOpacity>

                    {/* Transaction History List */}
                    {selectedQuotation.transactions &&
                      selectedQuotation.transactions.length > 0 ? (
                      <View
                        style={{
                          marginTop: 6,
                          borderTopWidth: 1,
                          borderTopColor: "#E2E8F0",
                          paddingTop: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#475569",
                            marginBottom: 8,
                          }}
                        >
                          Recorded Transactions (
                          {selectedQuotation.transactions.length}):
                        </Text>
                        {selectedQuotation.transactions.map(
                          (tx: any, idx: number) => (
                            <View
                              key={tx._id || idx}
                              style={{
                                backgroundColor: "#FFFFFF",
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
                                borderRadius: 6,
                                padding: 8,
                                marginBottom: 8,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "800",
                                    color: "#0F172A",
                                  }}
                                >
                                  {tx.transactionId ||
                                    tx.referenceId ||
                                    `TXN-${idx + 1}`}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: "800",
                                    color: "#7A131A",
                                  }}
                                >
                                  {formatINR(tx.amount)}
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  marginTop: 4,
                                }}
                              >
                                <Text
                                  style={{ fontSize: 11, color: "#64748B" }}
                                >
                                  Mode: {tx.paymentMethod || "UPI"} •{" "}
                                  {formatDate(
                                    tx.transactionDate || tx.createdAt,
                                  )}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: "#16A34A",
                                    fontWeight: "700",
                                  }}
                                >
                                  {tx.status || "Completed"}
                                </Text>
                              </View>
                              {tx.notes ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: "#64748B",
                                    fontStyle: "italic",
                                    marginTop: 2,
                                  }}
                                >
                                  Note: {tx.notes}
                                </Text>
                              ) : null}
                            </View>
                          ),
                        )}
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          fontStyle: "italic",
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
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

                  {/* Standalone Accessories List in Detail Modal */}
                  {selectedQuotation.standaloneAccessories &&
                    selectedQuotation.standaloneAccessories.length > 0 && (
                      <View style={styles.sectionBox}>
                        <Text style={styles.boxTitle}>
                          Accessories (
                          {selectedQuotation.standaloneAccessories.length})
                        </Text>
                        {selectedQuotation.standaloneAccessories.map(
                          (acc, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.itemCard,
                                {
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                },
                              ]}
                            >
                              {(() => {
                                const accImgs =
                                  Array.isArray(acc.images) &&
                                  acc.images.length > 0
                                    ? acc.images
                                    : acc.image
                                      ? [acc.image]
                                      : [];
                                const primaryImg = accImgs[0] || "";
                                if (!primaryImg) {
                                  return (
                                    <View
                                      style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 6,
                                        backgroundColor: "#F1F5F9",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Ionicons
                                        name="cube-outline"
                                        size={20}
                                        color="#94A3B8"
                                      />
                                    </View>
                                  );
                                }
                                return (
                                  <TouchableOpacity
                                    style={{ position: "relative" }}
                                    onPress={() =>
                                      setPreviewImageUri(
                                        resolveAccessoryImageUri(
                                          primaryImg,
                                          API_URL,
                                        ),
                                      )
                                    }
                                  >
                                    <Image
                                      source={{
                                        uri: resolveAccessoryImageUri(
                                          primaryImg,
                                          API_URL,
                                        ),
                                      }}
                                      style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: "#CBD5E1",
                                      }}
                                      resizeMode="contain"
                                    />
                                    {accImgs.length > 1 && (
                                      <View
                                        style={{
                                          position: "absolute",
                                          bottom: -2,
                                          right: -2,
                                          backgroundColor: "#7A131A",
                                          borderRadius: 8,
                                          paddingHorizontal: 4,
                                          paddingVertical: 1,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 9,
                                            fontWeight: "800",
                                            color: "#FFFFFF",
                                          }}
                                        >
                                          +{accImgs.length - 1}
                                        </Text>
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                );
                              })()}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.itemCardName}>
                                  {acc.name}
                                </Text>
                                {acc.description ? (
                                  <Text style={styles.itemCardSpecs}>
                                    {acc.description}
                                  </Text>
                                ) : null}
                                <Text style={styles.itemCardQty}>
                                  {acc.quantity} {acc.unit || "Nos"} @{" "}
                                  {formatINR(acc.price)}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.boldText,
                                  { fontSize: 14, color: "#0F172A" },
                                ]}
                              >
                                {formatINR(
                                  acc.total || acc.quantity * acc.price,
                                )}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    )}

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

                  {/* Bank & Company Info Box */}
                  <View
                    style={[
                      styles.sectionBox,
                      { backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" },
                    ]}
                  >
                    <Text style={styles.boxTitle}>
                      🏦 Company &amp; Bank Details
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Company:</Text>{" "}
                      {selectedQuotation.companyDetails?.name ||
                        "Altera Interior"}
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Address:</Text>{" "}
                      {selectedQuotation.companyDetails?.address ||
                        "Plot 16/2, Dhanwapur Village, Behind ATS Triumph Tower, Dwarka Expressway, Sec-104, Gurugram (HR)"}
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>Phone:</Text>{" "}
                      {selectedQuotation.companyDetails?.phone ||
                        "+91 9718374407"}{" "}
                      | <Text style={styles.boldText}>Email:</Text>{" "}
                      {selectedQuotation.companyDetails?.email ||
                        "info@alterainterior.com"}
                    </Text>
                    <Text style={styles.boxText}>
                      <Text style={styles.boldText}>GSTIN:</Text>{" "}
                      {selectedQuotation.companyDetails?.gstin ||
                        "06CFEPS8731P1Z0"}
                    </Text>
                    <View
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: "#E2E8F0",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#0F172A",
                          marginBottom: 4,
                        }}
                      >
                        Beneficiary Bank Account:
                      </Text>
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>Beneficiary:</Text>{" "}
                        {selectedQuotation.bankDetails?.accountName ||
                          "Altera Interior"}
                      </Text>
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>Bank Name:</Text>{" "}
                        {selectedQuotation.bankDetails?.bankName ||
                          "IndusInd Bank Limited"}
                      </Text>
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>Account No:</Text>{" "}
                        {selectedQuotation.bankDetails?.accountNumber ||
                          "201002880175"}
                      </Text>
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>IFSC Code:</Text>{" "}
                        {selectedQuotation.bankDetails?.ifscCode ||
                          "INDB0000518"}
                      </Text>
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>Branch:</Text>{" "}
                        {selectedQuotation.bankDetails?.branch ||
                          "Sector-31, Gurgaon Branch"}
                      </Text>
                      <Text style={styles.boxText}>
                        <Text style={styles.boldText}>Bank Address:</Text>{" "}
                        {selectedQuotation.bankDetails?.bankAddress ||
                          "SCO-8, Sector 31/32A HUDA Market, Gurgaon – 122 002, Haryana, India"}
                      </Text>
                    </View>
                  </View>

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
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
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
                { num: 2, label: "Scope & Items" },
                { num: 3, label: "Accessories" },
                { num: 4, label: "Pricing & GST" },
                { num: 5, label: "Milestones" },
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
              contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              showsVerticalScrollIndicator={true}
            >
              {/* STEP 1: CLIENT & PROJECT */}
              {formStep === 1 && (
                <View>
                  <Text style={styles.formSectionTitle}>
                    Client Information
                  </Text>
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

                  <View style={{ flexDirection: "row", gap: 4 }}>
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
                    placeholder="e.g. 06CFEPS8731P1Z0"
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 6, marginBottom: 8 }}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {[
                      "Residential",
                      "Commercial",
                      "Interior",
                      "Modular Kitchen",
                      "Modular Wardrobe",
                      "Wardrobe/Kitchen",
                      "Modular Work",
                      "Architecture",
                      "Renovation",
                    ].map((pt) => (
                      <TouchableOpacity
                        key={pt}
                        style={[
                          styles.smallPill,
                          projectType === pt && styles.smallPillActive,
                          { paddingHorizontal: 10, paddingVertical: 4 },
                        ]}
                        onPress={() => setProjectType(pt)}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            projectType === pt && styles.smallPillTextActive,
                            { fontSize: 11 },
                          ]}
                        >
                          {pt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

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
                          style={{ flexDirection: "row", gap: 4, marginTop: 4 }}
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
                      padding: 8,
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
                        DEFAULT_CATEGORY_SUB_ITEMS[selectedRoom] || [
                          "+ Add More",
                        ]
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
                        style={{ flexDirection: "row", gap: 4, marginTop: 10 }}
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
                        style={{
                          flexDirection: "row",
                          gap: 4,
                          marginBottom: 10,
                        }}
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
                        style={{
                          flexDirection: "row",
                          gap: 4,
                          marginBottom: 10,
                        }}
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
                      style={{
                        flexDirection: "row",
                        gap: 4,
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>
                          Size ({itemUnit}) *
                        </Text>
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
                        style={{
                          flexDirection: "row",
                          gap: 4,
                          marginBottom: 10,
                        }}
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
                          <Text style={styles.addCustomBtnText}>
                            + Material
                          </Text>
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
                        style={{
                          flexDirection: "row",
                          gap: 4,
                          marginBottom: 10,
                        }}
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
                          <Text style={styles.addCustomBtnText}>
                            + Hardware
                          </Text>
                        </TouchableOpacity>
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
                      <View
                        key={i}
                        style={[
                          styles.addedItemRow,
                          { flexDirection: "column", alignItems: "stretch" },
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.addedItemName}>
                              {it.name}{" "}
                              <Text style={{ color: "#7A131A" }}>
                                [{it.room}]
                              </Text>
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              <Text style={{ fontSize: 11, color: "#64748B" }}>
                                Size/Qty ({it.unit || "Sq Ft"}):
                              </Text>
                              <TextInput
                                style={{
                                  width: 45,
                                  height: 26,
                                  borderBottomWidth: 1,
                                  borderBottomColor: "#CBD5E1",
                                  textAlign: "center",
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                                keyboardType="numeric"
                                value={String(it.quantity)}
                                onChangeText={(val) =>
                                  handleUpdateItemQty(i, val)
                                }
                              />
                              <Text style={{ fontSize: 11, color: "#64748B" }}>
                                × Rate (₹):
                              </Text>
                              <TextInput
                                style={{
                                  width: 55,
                                  height: 26,
                                  borderBottomWidth: 1,
                                  borderBottomColor: "#CBD5E1",
                                  textAlign: "center",
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                                keyboardType="numeric"
                                value={String(it.rate)}
                                onChangeText={(val) =>
                                  handleUpdateItemRate(i, val)
                                }
                              />
                            </View>
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Text
                              style={[
                                styles.boldText,
                                { fontSize: 14, color: "#0F172A" },
                              ]}
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
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setItems((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                )
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
                        </View>

                        {it.accessories && it.accessories.length > 0 && (
                          <View
                            style={{
                              marginTop: 6,
                              paddingLeft: 8,
                              borderLeftWidth: 2,
                              borderLeftColor: "#FDA4AF",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: "#881337",
                              }}
                            >
                              Included Accessories:
                            </Text>
                            {it.accessories.map((acc, aIdx) => (
                              <Text
                                key={aIdx}
                                style={{ fontSize: 10, color: "#475569" }}
                              >
                                •{" "}
                                <Text style={{ fontWeight: "700" }}>
                                  {acc.name}
                                </Text>{" "}
                                (Qty: {acc.qty}, Unit Price:{" "}
                                {formatINR(acc.unitPrice)}, Total:{" "}
                                {formatINR(acc.cost)})
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))
                  )}

                  {/* Items Subtotal Card for Step 2 */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#FFF5F5",
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#FECDD3",
                      marginTop: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color: "#7A131A",
                      }}
                    >
                      Items Subtotal ({items.length} items):
                    </Text>
                    <Text
                      style={{
                        fontWeight: "800",
                        fontSize: 16,
                        color: "#7A131A",
                      }}
                    >
                      {formatINR(liveCalculation.rawSubtotal)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setFormStep(3)}
                  >
                    <Text style={styles.nextStepBtnText}>
                      Next: Accessories →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: ACCESSORIES */}
              {formStep === 3 && (
                <View>
                  <Text style={styles.formSectionTitle}>
                    Standalone Accessories ({standaloneAccessories.length})
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}
                  >
                    Add hardware accessories, appliances, or fittings with
                    catalog images to include in quotation.
                  </Text>

                  {/* Form to Add / Edit Accessory */}
                  <View style={styles.itemComposerCard}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#0F172A",
                        marginBottom: 12,
                      }}
                    >
                      {editingAccIndex !== null
                        ? "Edit Accessory"
                        : "+ Add New Accessory"}
                    </Text>

                    {/* 1. Accessory Name Input */}
                    <Text style={styles.inputLabel}>Accessory Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Cutlery Tray / Magic Corner"
                      value={stAccName}
                      onChangeText={setStAccName}
                    />

                    {/* 2. Select Accessories Chips */}
                    <Text
                      style={[
                        styles.inputLabel,
                        { fontSize: 11, color: "#64748B", marginBottom: 4 },
                      ]}
                    >
                      Select Accessories
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 8 }}
                      contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                    >
                      {stAccessoryOptions.map((cat) => {
                        const isAddMore = cat === "+ Add More";
                        const isActive = isAddMore
                          ? showStAccCustomAccessory
                          : !showStAccCustomAccessory && stAccName === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.smallPill,
                              { paddingVertical: 6, paddingHorizontal: 12 },
                              isActive && styles.smallPillActive,
                            ]}
                            onPress={() => handleSelectStAccessory(cat)}
                          >
                            <Text
                              style={[
                                styles.smallPillText,
                                isActive && styles.smallPillTextActive,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {showStAccCustomAccessory && (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          marginBottom: 12,
                          alignItems: "center",
                        }}
                      >
                        <TextInput
                          style={[
                            styles.textInput,
                            { flex: 1, marginBottom: 0 },
                          ]}
                          placeholder="Custom Accessory Name..."
                          value={stAccCustomAccessory}
                          onChangeText={(val) => {
                            setStAccCustomAccessory(val);
                            if (val.trim()) setStAccName(val);
                          }}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.addCustomBtn}
                          onPress={() => handleConfirmCustomStAccAccessory()}
                        >
                          <Ionicons name="add" size={16} color="#ffffff" />
                          <Text style={styles.addCustomBtnText}>Add Option</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* 3. Hardware Name Input */}
                    <Text style={styles.inputLabel}>Hardware Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Hettich Soft Close"
                      value={stAccDesc}
                      onChangeText={setStAccDesc}
                    />

                    {/* 4. Select Hardware Chips */}
                    <Text
                      style={[
                        styles.inputLabel,
                        { fontSize: 11, color: "#64748B", marginBottom: 4 },
                      ]}
                    >
                      Select Hardware
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 8 }}
                      contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                    >
                      {stAccHardwareOptions.map((opt) => {
                        const isAddMore = opt === "+ Add More";
                        const isActive = isAddMore
                          ? showStAccCustomHardware
                          : !showStAccCustomHardware && stAccDesc === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.smallPill,
                              { paddingVertical: 6, paddingHorizontal: 12 },
                              isActive && styles.smallPillActive,
                            ]}
                            onPress={() => handleSelectStAccHardware(opt)}
                          >
                            <Text
                              style={[
                                styles.smallPillText,
                                isActive && styles.smallPillTextActive,
                              ]}
                            >
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {showStAccCustomHardware && (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          marginBottom: 12,
                          alignItems: "center",
                        }}
                      >
                        <TextInput
                          style={[
                            styles.textInput,
                            { flex: 1, marginBottom: 0 },
                          ]}
                          placeholder="Custom Hardware Name..."
                          value={stAccCustomHardware}
                          onChangeText={(val) => {
                            setStAccCustomHardware(val);
                            if (val.trim()) setStAccDesc(val);
                          }}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.addCustomBtn}
                          onPress={() => handleConfirmCustomStAccHardware()}
                        >
                          <Ionicons name="add" size={16} color="#ffffff" />
                          <Text style={styles.addCustomBtnText}>Add Option</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* 5. Accessory Image Actions: Upload & Predefined Catalog */}
                    <Text style={styles.inputLabel}>Accessory Image</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingVertical: 9,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: "#CBD5E1",
                          borderStyle: "dashed",
                          backgroundColor: "#F8FAFC",
                        }}
                        onPress={handlePickAccImage}
                      >
                        <Ionicons
                          name="camera-outline"
                          size={18}
                          color="#475569"
                        />
                        <Text
                          style={{
                            color: "#475569",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Upload Photo
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingVertical: 9,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#7A131A",
                          backgroundColor: "#FFFFFF",
                        }}
                        onPress={handleOpenGalleryModal}
                      >
                        <Ionicons
                          name="images-outline"
                          size={18}
                          color="#7A131A"
                        />
                        <Text
                          style={{
                            color: "#7A131A",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Select Predefined ({catalogAccessories.length} items)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Selected Photos Thumbnails Preview */}
                    {(() => {
                      const displayImgs =
                        stAccImages.length > 0
                          ? stAccImages
                          : stAccImage
                            ? [stAccImage]
                            : [];
                      if (displayImgs.length === 0) return null;
                      return (
                        <View
                          style={{
                            marginBottom: 14,
                            padding: 10,
                            backgroundColor: "#F8FAFC",
                            borderWidth: 1,
                            borderColor: "#CBD5E1",
                            borderRadius: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: "#1E293B",
                              }}
                            >
                              Selected Photos ({displayImgs.length})
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <TouchableOpacity
                                onPress={handleOpenGalleryModal}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: "#7A131A",
                                  }}
                                >
                                  + Add More
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={handleClearAllAccFormImages}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: "#EF4444",
                                  }}
                                >
                                  Clear All
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                              gap: 8,
                              paddingVertical: 4,
                            }}
                          >
                            {displayImgs.map((imgUri, imgIdx) => (
                              <View
                                key={imgIdx}
                                style={{
                                  position: "relative",
                                  width: 64,
                                  height: 64,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: "#CBD5E1",
                                  backgroundColor: "#FFFFFF",
                                  overflow: "visible",
                                }}
                              >
                                <TouchableOpacity
                                  style={{ width: "100%", height: "100%" }}
                                  onPress={() =>
                                    setPreviewImageUri(
                                      resolveAccessoryImageUri(imgUri, API_URL),
                                    )
                                  }
                                >
                                  <Image
                                    source={{
                                      uri: resolveAccessoryImageUri(
                                        imgUri,
                                        API_URL,
                                      ),
                                    }}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      borderRadius: 7,
                                    }}
                                    resizeMode="contain"
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={{
                                    position: "absolute",
                                    top: -6,
                                    right: -6,
                                    backgroundColor: "#EF4444",
                                    borderRadius: 10,
                                    width: 20,
                                    height: 20,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderWidth: 1.5,
                                    borderColor: "#FFFFFF",
                                    elevation: 2,
                                  }}
                                  onPress={() =>
                                    handleRemoveSingleAccFormImage(imgIdx)
                                  }
                                >
                                  <Ionicons
                                    name="close"
                                    size={12}
                                    color="#FFFFFF"
                                  />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })()}

                    {/* 6. Unit, Qty, Unit Price */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Unit</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Pcs / Nos"
                          value={stAccUnit}
                          onChangeText={setStAccUnit}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Quantity *</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          value={stAccQty}
                          onChangeText={setStAccQty}
                        />
                      </View>

                      <View style={{ flex: 1.4 }}>
                        <Text style={styles.inputLabel}>Price (₹/unit) *</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          placeholder="e.g. 2500"
                          value={stAccPrice}
                          onChangeText={setStAccPrice}
                        />
                      </View>
                    </View>

                    {/* Total Amount Display */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderTopWidth: 1,
                        borderTopColor: "#F1F5F9",
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          fontWeight: "600",
                        }}
                      >
                        Item Total:
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "800",
                          color: "#7A131A",
                        }}
                      >
                        {formatINR(
                          Math.round(
                            (parseFloat(stAccQty) || 0) *
                              (parseFloat(stAccPrice) || 0),
                          ),
                        )}
                      </Text>
                    </View>

                    {/* Form Action Buttons */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      {editingAccIndex !== null && (
                        <TouchableOpacity
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            backgroundColor: "#E2E8F0",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onPress={handleCancelEditStandaloneAccessory}
                        >
                          <Text
                            style={{
                              color: "#475569",
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.addItemSubmitBtn,
                          { flex: editingAccIndex !== null ? 1 : undefined },
                        ]}
                        onPress={handleAddOrUpdateStandaloneAccessory}
                      >
                        <Ionicons
                          name={
                            editingAccIndex !== null
                              ? "checkmark-circle-outline"
                              : "add-circle-outline"
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.addItemSubmitText}>
                          {editingAccIndex !== null
                            ? "Update Accessory"
                            : "Add Accessory"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Standalone Accessories Added List */}
                  <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>
                    Accessories Added ({standaloneAccessories.length})
                  </Text>

                  {standaloneAccessories.length === 0 ? (
                    <Text
                      style={{
                        color: "#94A3B8",
                        fontStyle: "italic",
                        marginBottom: 20,
                      }}
                    >
                      No standalone accessories added yet. Add accessories
                      above to include them in the quotation.
                    </Text>
                  ) : (
                    standaloneAccessories.map((acc, index) => {
                      const accImgs =
                        Array.isArray(acc.images) && acc.images.length > 0
                          ? acc.images
                          : acc.image
                            ? [acc.image]
                            : [];
                      const primaryImg = accImgs[0] || "";
                      return (
                        <View
                          key={index}
                          style={[
                            styles.addedItemRow,
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                              paddingVertical: 10,
                            },
                          ]}
                        >
                          {primaryImg ? (
                            <TouchableOpacity
                              style={{ position: "relative" }}
                              onPress={() =>
                                setPreviewImageUri(
                                  resolveAccessoryImageUri(primaryImg, API_URL),
                                )
                              }
                            >
                              <Image
                                source={{
                                  uri: resolveAccessoryImageUri(
                                    primaryImg,
                                    API_URL,
                                  ),
                                }}
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: "#CBD5E1",
                                  backgroundColor: "#FFFFFF",
                                }}
                                resizeMode="contain"
                              />
                              {accImgs.length > 1 && (
                                <View
                                  style={{
                                    position: "absolute",
                                    bottom: -3,
                                    right: -3,
                                    backgroundColor: "#7A131A",
                                    borderRadius: 8,
                                    paddingHorizontal: 4,
                                    paddingVertical: 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: "800",
                                      color: "#FFFFFF",
                                    }}
                                  >
                                    +{accImgs.length - 1}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: 6,
                                backgroundColor: "#F1F5F9",
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
                              }}
                            >
                              <Ionicons
                                name="cube-outline"
                                size={22}
                                color="#94A3B8"
                              />
                            </View>
                          )}

                          <View style={{ flex: 1 }}>
                            <Text style={styles.addedItemName}>{acc.name}</Text>
                            {acc.description ? (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#64748B",
                                  marginTop: 1,
                                }}
                              >
                                {acc.description}
                              </Text>
                            ) : null}
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#475569",
                                marginTop: 3,
                              }}
                            >
                              {acc.quantity} {acc.unit || "Pcs"} ×{" "}
                              {formatINR(acc.price)}
                            </Text>
                          </View>

                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <Text
                              style={[
                                styles.boldText,
                                { fontSize: 13, color: "#0F172A" },
                              ]}
                            >
                              {formatINR(
                                acc.total || acc.quantity * acc.price,
                              )}
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
                              <TouchableOpacity
                                onPress={() =>
                                  handleEditStandaloneAccessory(index)
                                }
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                              >
                                <Ionicons
                                  name="pencil-outline"
                                  size={17}
                                  color="#7A131A"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() =>
                                  handleRemoveStandaloneAccessory(index)
                                }
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={17}
                                  color="#EF4444"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Accessories Subtotal Card */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#F0FDF4",
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#BBF7D0",
                      marginTop: 14,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color: "#166534",
                      }}
                    >
                      Accessories Subtotal ({standaloneAccessories.length}{" "}
                      items):
                    </Text>
                    <Text
                      style={{
                        fontWeight: "800",
                        fontSize: 16,
                        color: "#166534",
                      }}
                    >
                      {formatINR(liveCalculation.standaloneAccTotal)}
                    </Text>
                  </View>

                  {/* Navigation Buttons: Back to Scope and Next to Pricing */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 10,
                      marginTop: 8,
                      marginBottom: 20,
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.backStepBtn,
                        { flex: 1, marginVertical: 0 },
                      ]}
                      onPress={() => setFormStep(2)}
                    >
                      <Text style={styles.backStepBtnText}>
                        ← Back to Scope
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.nextStepBtn,
                        { flex: 1, marginVertical: 0 },
                      ]}
                      onPress={() => setFormStep(4)}
                    >
                      <Text style={styles.nextStepBtnText}>
                        Next: Pricing &amp; Taxes →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 4: CHARGES, GST & SUMMARY */}
              {formStep === 4 && (
                <View>
                  <Text style={styles.formSectionTitle}>
                    Additional Fees &amp; Discounts
                  </Text>

                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>
                        Handling Charges (%)
                      </Text>
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

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>
                      Transportation Charges (₹ Fixed)
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={transportCharges}
                      onChangeText={setTransportCharges}
                    />
                    <Text
                      style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}
                    >
                      Fixed amount in Rupees (NOT percentage)
                    </Text>
                  </View>

                  <View
                    style={{ flexDirection: "row", gap: 4, marginTop: 12 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Discount Type</Text>
                      <View
                        style={{ flexDirection: "row", gap: 4, marginTop: 4 }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.smallPill,
                            discountType === "PERCENT" &&
                            styles.smallPillActive,
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
                          gstType === "AS_PER_ACTUAL" &&
                          styles.roomPillTextActive,
                        ]}
                      >
                        18%
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.roomPill,
                        gstType !== "AS_PER_ACTUAL" &&
                        parseFloat(gstPercent) === 18 &&
                        styles.roomPillActive,
                      ]}
                      onPress={() => {
                        setGstPercent("18");
                        setGstType("CGST_SGST");
                      }}
                    >
                      <Text
                        style={[
                          styles.roomPillText,
                          gstType !== "AS_PER_ACTUAL" &&
                          parseFloat(gstPercent) === 18 &&
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
                          gstType !== "AS_PER_ACTUAL" &&
                          parseFloat(gstPercent) === rate &&
                          styles.roomPillActive,
                        ]}
                        onPress={() => {
                          setGstPercent(String(rate));
                          if (gstType === "AS_PER_ACTUAL")
                            setGstType("CGST_SGST");
                        }}
                      >
                        <Text
                          style={[
                            styles.roomPillText,
                            gstType !== "AS_PER_ACTUAL" &&
                            parseFloat(gstPercent) === rate &&
                            styles.roomPillTextActive,
                          ]}
                        >
                          GST {rate}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
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
                            gstType === "AS_PER_ACTUAL" &&
                            styles.smallPillActive,
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
                            As Per Actuals
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
                        padding: 8,
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
                        ℹ️ GST 18% will be charged as per actuals and is not
                        included in the estimated total.
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: "#ECFDF5",
                        padding: 8,
                        borderRadius: 8,
                        borderColor: "#A7F3D0",
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
                        ✓ GST {gstPercent}% is calculated and included in the
                        estimated total.
                      </Text>
                    </View>
                  )}

                  {/* Final Quotation Summary Box */}
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
                      Final Quotation Summary
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Subtotal:</Text>
                      <Text style={styles.priceVal}>
                        {formatINR(liveCalculation.rawSubtotal)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        Design Fees ({designPercent}%):
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(liveCalculation.designFee)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        Handling Fees ({handlingPercent}%):
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(liveCalculation.handlingFee)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        Transportation Charges:
                      </Text>
                      <Text style={styles.priceVal}>
                        {formatINR(liveCalculation.transportAmt)}
                      </Text>
                    </View>
                    {liveCalculation.discountAmt > 0 && (
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: "#7A131A" }]}>
                          Discount:
                        </Text>
                        <Text style={[styles.priceVal, { color: "#7A131A" }]}>
                          -{formatINR(liveCalculation.discountAmt)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        GST/Taxes ({gstPercent}%
                        {gstType === "AS_PER_ACTUAL" ? " - Extra" : ""}
                        ):
                      </Text>
                      <Text style={styles.priceVal}>
                        {gstType === "AS_PER_ACTUAL"
                          ? "As per Actuals"
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
                      <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                      <Text style={styles.grandTotalVal}>
                        {formatINR(liveCalculation.grandTotal)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setFormStep(5)}
                  >
                    <Text style={styles.nextStepBtnText}>
                      Next: Milestones &amp; Notes →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 5: MILESTONES & FINALIZE */}
              {formStep === 5 && (
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
                        style={[
                          styles.textInput,
                          { marginTop: 6, fontSize: 11 },
                        ]}
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── EMAIL MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        visible={isEmailModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEmailModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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

              <ScrollView
                style={{ padding: 12 }}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              >
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
                    Attachment: Quotation_{selectedQuotation?.quotationNumber}
                    .pdf (Automatically generated)
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
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADD TRANSACTION MODAL ──────────────────────────────────────────────── */}
      <Modal
        visible={isAddTxnModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddTxnModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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

              <ScrollView
                style={{ padding: 12 }}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              >
                <Text
                  style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}
                >
                  Quotation:{" "}
                  <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                    #{selectedQuotation?.quotationNumber}
                  </Text>{" "}
                  ({selectedQuotation?.client?.name})
                </Text>

                {selectedQuotation?.paymentSummary && (
                  <View
                    style={{
                      backgroundColor: "#F8FAFC",
                      padding: 8,
                      borderRadius: 8,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#64748B" }}>
                      Grand Total:{" "}
                      <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                        {formatINR(
                          selectedQuotation.paymentSummary.totalAmount,
                        )}
                      </Text>
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: "#7A131A", marginTop: 2 }}
                    >
                      Paid So Far:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {formatINR(selectedQuotation.paymentSummary.paidAmount)}
                      </Text>
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}
                    >
                      Remaining Balance:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {formatINR(
                          selectedQuotation.paymentSummary.remainingAmount,
                        )}
                      </Text>
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

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                  Payment Method *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 4,
                    marginVertical: 6,
                  }}
                >
                  {["UPI", "Bank Transfer", "Cash", "Cheque", "Card"].map(
                    (method) => {
                      const isActive = txnPaymentMethod === method;
                      return (
                        <TouchableOpacity
                          key={method}
                          style={[
                            styles.smallPill,
                            isActive && styles.smallPillActive,
                          ]}
                          onPress={() => setTxnPaymentMethod(method)}
                        >
                          <Text
                            style={[
                              styles.smallPillText,
                              isActive && styles.smallPillTextActive,
                            ]}
                          >
                            {method}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                <Text style={styles.inputLabel}>
                  Reference / Transaction ID (Optional)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. UTR / Cheque No / Txn Ref"
                  value={txnReferenceId}
                  onChangeText={setTxnReferenceId}
                />

                <Text style={styles.inputLabel}>
                  Notes / Remarks (Optional)
                </Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  multiline
                  placeholder="e.g. Advance 10% token payment received"
                  value={txnNotes}
                  onChangeText={setTxnNotes}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    { marginTop: 16, backgroundColor: "#7A131A" },
                  ]}
                  onPress={handleAddTxnSubmit}
                  disabled={isSubmittingTxn}
                >
                  {isSubmittingTxn ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#ffffff"
                      />
                      <Text style={styles.primaryActionBtnText}>
                        Save & Sync Transaction
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PREDEFINED HARDWARE ACCESSORIES GALLERY MODAL ─────────────────────── */}
      <Modal
        visible={showAccGalleryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAccGalleryModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={styles.galleryModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Hardware Accessory</Text>
                <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Select photos from catalog ({catalogAccessories.length} items) or add custom.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAccGalleryModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F1F5F9",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  height: 38,
                }}
              >
                <Ionicons name="search-outline" size={16} color="#64748B" />
                <TextInput
                  placeholder="Search (e.g. Lift Basket, Magic Corner...)"
                  value={accGallerySearch}
                  onChangeText={setAccGallerySearch}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "#0F172A",
                    marginLeft: 6,
                    paddingVertical: 0,
                  }}
                />
                {accGallerySearch ? (
                  <TouchableOpacity onPress={() => setAccGallerySearch("")}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Category Filter Pills + Add More Button */}
            <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: "center" }}
              >
                {["All", "Kitchen Accessories", "Wardrobe Accessories"].map(
                  (cat) => {
                    const isActive = accGalleryCategory === cat;
                    const count =
                      cat === "All"
                        ? catalogAccessories.length
                        : catalogAccessories.filter((a) => a.category === cat)
                            .length;
                    const label =
                      cat === "All"
                        ? `All (${count})`
                        : cat === "Kitchen Accessories"
                          ? `Kitchen (${count})`
                          : `Wardrobe (${count})`;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.smallPill,
                          isActive && styles.smallPillActive,
                          { paddingVertical: 5, paddingHorizontal: 10 },
                        ]}
                        onPress={() => {
                          setAccGalleryCategory(cat);
                          setShowAddCustomModalItem(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            isActive && styles.smallPillTextActive,
                            { fontSize: 11 },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 16,
                    backgroundColor: showAddCustomModalItem
                      ? "#7A131A"
                      : "#FFF5F5",
                    borderWidth: 1,
                    borderColor: "#7A131A",
                  }}
                  onPress={() => setShowAddCustomModalItem((v) => !v)}
                >
                  <Ionicons
                    name="add"
                    size={14}
                    color={showAddCustomModalItem ? "#FFFFFF" : "#7A131A"}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: showAddCustomModalItem ? "#FFFFFF" : "#7A131A",
                    }}
                  >
                    Add More
                  </Text>
                </TouchableOpacity>

                {modalSelectedItems.length > 0 && (
                  <View
                    style={{
                      backgroundColor: "#FEE2E2",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#7A131A",
                      }}
                    >
                      {modalSelectedItems.length} selected
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Inline Custom Accessory Form */}
            {showAddCustomModalItem && (
              <View
                style={{
                  marginHorizontal: 14,
                  marginBottom: 8,
                  padding: 10,
                  backgroundColor: "#FFF5F5",
                  borderWidth: 1,
                  borderColor: "#FECDD3",
                  borderRadius: 8,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#7A131A",
                    }}
                  >
                    ➕ Add Custom Hardware to Catalog
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddCustomModalItem(false)}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[
                    styles.textInput,
                    { height: 36, fontSize: 12, marginBottom: 0 },
                  ]}
                  placeholder="Accessory Name *"
                  value={customModalItemName}
                  onChangeText={setCustomModalItemName}
                />

                <View
                  style={{
                    flexDirection: "row",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      fontWeight: "600",
                    }}
                  >
                    Category:
                  </Text>
                  {["Kitchen Accessories", "Wardrobe Accessories"].map((c) => {
                    const isSel = customModalItemCategory === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.smallPill,
                          isSel && styles.smallPillActive,
                          { paddingVertical: 4, paddingHorizontal: 8 },
                        ]}
                        onPress={() => setCustomModalItemCategory(c)}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            isSel && styles.smallPillTextActive,
                            { fontSize: 10 },
                          ]}
                        >
                          {c.replace(" Accessories", "")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      height: 36,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      backgroundColor: "#FFFFFF",
                    }}
                    onPress={handlePickCustomModalItemImage}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={16}
                      color="#475569"
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        fontWeight: "600",
                      }}
                    >
                      {customModalItemImage ? "Change Image" : "Pick Image *"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      height: 36,
                      borderRadius: 6,
                      backgroundColor: "#7A131A",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={handleSaveCustomModalItem}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      Save to Catalog
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Catalog Grid */}
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 14 }}
              contentContainerStyle={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                paddingVertical: 8,
              }}
            >
              {filteredPredefinedAccessories.map((item) => {
                const isSelected = modalSelectedItems.some(
                  (it) => it.id === item.id || it.image === item.image,
                );
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: "48%",
                      backgroundColor: "#FFFFFF",
                      borderRadius: 8,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "#7A131A" : "#E2E8F0",
                      padding: 8,
                      alignItems: "center",
                      position: "relative",
                    }}
                    onPress={() => handleToggleModalItemSelect(item)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        width: "100%",
                        height: 90,
                        backgroundColor: "#F8FAFC",
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={{
                          uri: resolveAccessoryImageUri(item.image, API_URL),
                        }}
                        style={{ width: "90%", height: "90%" }}
                        resizeMode="contain"
                      />
                    </View>

                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isSelected ? "#7A131A" : "#0F172A",
                        marginTop: 6,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#64748B",
                        marginTop: 1,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {item.category}
                    </Text>

                    {isSelected && (
                      <View
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          backgroundColor: "#7A131A",
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                    )}

                    {item.isCustom && (
                      <TouchableOpacity
                        style={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          backgroundColor: "rgba(239,68,68,0.9)",
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => handleDeleteCustomCatalogItem(item.id)}
                      >
                        <Ionicons name="trash" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Modal Footer Actions */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                padding: 12,
                borderTopWidth: 1,
                borderTopColor: "#E2E8F0",
                backgroundColor: "#FFFFFF",
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 8,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handleBatchAddModalItems}
                disabled={modalSelectedItems.length === 0}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color:
                      modalSelectedItems.length === 0 ? "#94A3B8" : "#475569",
                  }}
                >
                  Batch Add ({modalSelectedItems.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  paddingVertical: 11,
                  borderRadius: 8,
                  backgroundColor: "#7A131A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handleApplyModalSelection}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#FFFFFF",
                  }}
                >
                  Apply Selection ({modalSelectedItems.length} photos)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── FULL SCREEN IMAGE PREVIEW MODAL ────────────────────────────────────── */}
      <Modal
        visible={!!previewImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: "rgba(255,255,255,0.3)",
              borderRadius: 20,
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
            onPress={() => setPreviewImageUri(null)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {previewImageUri ? (
            <Image
              source={{ uri: previewImageUri }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          ) : null}
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
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7A131A',
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
    paddingHorizontal: 10,
    gap: 4,
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#7A131A',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
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
  listContent: { padding: 8, paddingBottom: 40 },
  centerBox: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 13 },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7A131A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
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
    padding: 8,
    marginBottom: 6,
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
    gap: 4,
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
    paddingHorizontal: 6,
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
    gap: 4,
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7A131A',
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
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
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  boxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A131A',
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  boxText: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#4B5563',
  },
  priceVal: {
    fontSize: 12,
    fontWeight: "700",
    color: '#111827',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7A131A',
  },
  grandTotalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7A131A',
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
    padding: 6,
    marginBottom: 4,
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
    color: '#111827',
    marginTop: 2,
  },
  itemCardQty: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  itemCardSpecs: {
    fontSize: 13,
    color: '#6B7280',
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
    gap: 4,
    marginTop: 10,
    marginBottom: 24,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7A131A",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 4,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  secondaryActionBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7A131A",
  },
  editActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  editActionBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  convertBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7A131A",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  creatorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7A131A',
  },
  saveHeaderBtn: {
    backgroundColor: "#7A131A",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveHeaderText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7A131A',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: '#4B5563',
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 10,
    fontSize: 12,
    color: "#0F172A",
  },
  nextStepBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  nextStepBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  backStepBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  backStepBtnText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 12,
  },
  galleryModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  roomPill: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    marginRight: 2,
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
    padding: 6,
    marginBottom: 12,
  },
  composerHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7A131A",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  addAccBtn: {
    width: 32,
    height: 32,
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
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  addItemSubmitText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  addedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 8,
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
    paddingHorizontal: 6,
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
    padding: 8,
    marginBottom: 8,
  },

  attachBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 4,
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
    padding: 8,
    marginBottom: 16,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7A131A",
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  addCustomBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});

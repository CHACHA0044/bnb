"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Edit2, Trash2, Check, X, 
  ChevronRight, ChevronLeft, UtensilsCrossed, Settings2, 
  Tag, Image as ImageIcon, AlertCircle, Save,
  ArrowLeft, History, RotateCcw, Eye, EyeOff, Loader2,
  Upload, X as XIcon, CloudUpload, ImageIcon as ImageIconLucide, Star
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";
import { 
  adminFetchFullMenu, adminUpdateMenuItem, adminCreateMenuItem,
  adminDeleteMenuItem, adminToggleStock, adminCreateCategory,
  adminUpdateCategory, adminDeleteCategory, adminBulkDiscount,
  adminFetchMenuVersions, adminRollbackMenu, adminBulkUpdateStock,
  adminUploadImage
} from "@/lib/api";
import Image from "next/image";

interface AdminMenuManagerProps {
  secret: string;
}

function CustomCategoryDropdown({ 
  isOpen, categories, selectedId, onSelect, onAddNew 
}: { 
  isOpen: boolean, categories: any[], selectedId: string, onSelect: (id: string) => void, onAddNew: () => void 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-[#3A241C]/10 overflow-hidden z-[150]"
        >
          <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`w-full px-6 py-4 text-left font-bold text-sm flex items-center justify-between transition-colors ${cat.id === selectedId ? "bg-[#3A241C] text-white" : "text-[#3A241C] hover:bg-[#F9F7F4]"}`}
              >
                {cat.name}
                {cat.id === selectedId && <Check size={16} />}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="w-full p-4 bg-[#F9F7F4] border-t border-[#3A241C]/5 text-[#E76F51] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#E76F51] hover:text-white transition-all"
          >
            <Plus size={14} />
            Add New Category
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ImageUpload({ 
  currentImage, 
  onFileSelect, 
  onReset 
}: { 
  currentImage: string | null, 
  onFileSelect: (file: File) => void, 
  onReset: () => void 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (file && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFileSelect(file);
    } else {
      alert("Please upload a JPG, PNG or WebP image.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const displayImage = preview || currentImage;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between px-1 shrink-0 pb-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40">Item Image</label>
        {displayImage && (
          <button 
            type="button" 
            onClick={() => { setPreview(null); onReset(); }}
            className="text-[10px] font-black text-[#B71C1C] uppercase tracking-widest hover:underline"
          >
            Remove Image
          </button>
        )}
      </div>

      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative group flex-1 rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden gap-3 block w-full min-h-[12rem] ${dragActive ? "border-[#E76F51] bg-[#E76F51]/5" : "border-[#3A241C]/10 bg-[#F9F7F4] hover:border-[#E76F51]/30 hover:bg-[#F9F7F4]/80"}`}
      >
        {displayImage ? (
          <>
            <Image 
              src={displayImage} 
              alt="Preview" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-[#3A241C]/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm z-10 rounded-[2rem]">
              <div className="bg-white/20 p-4 rounded-full border border-white/20 mb-2">
                <Upload className="text-white" size={24} />
              </div>
              <span className="text-white text-xs font-bold uppercase tracking-widest drop-shadow-md">Upload</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#3A241C]/10">
              <CloudUpload size={32} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-[#3A241C]">Drag & Drop to upload</p>
              <p className="text-[10px] font-medium text-[#3A241C]/40 uppercase tracking-widest mt-1">or click to browse</p>
            </div>
          </>
        )}
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
        />
      </div>
    </div>
  );
}

export default function AdminMenuManager({ secret }: AdminMenuManagerProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ITEMS" | "CATEGORIES" | "VERSIONS">("ITEMS");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showBulkDiscount, setShowBulkDiscount] = useState<string | null>(null); // categoryId
  const [versions, setVersions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Stock Management (Mark & Save)
  const [pendingStock, setPendingStock] = useState<Record<string, boolean>>({});
  const [savingStock, setSavingStock] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown state
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Modals for Variants and Delete
  const [variantToEdit, setVariantToEdit] = useState<{ index: number | "NEW", name: string, price: number, volume: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);

  const loadData = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await adminFetchFullMenu(secret);
      const filtered = data.categories
        .filter(c => c.name !== "Others" && c.name !== "Hidden")
        .map(c => ({
           ...c,
           items: c.items.filter(i => i.name !== "Packing Charges")
        }));
      setCategories(filtered);
      setPendingStock({}); // Reset pending on reload
    } catch (err) {
      showToast("Failed to load menu", "error");
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, [secret]);

  const loadVersions = useCallback(async () => {
    try {
      const data = await adminFetchMenuVersions(secret);
      setVersions(data);
    } catch (err) {
      showToast("Failed to load versions", "error");
    }
  }, [secret]);

  const { on } = useSocket();

  useEffect(() => {
    const unsubs = [
      on("menu_updated", () => loadData(false))
    ];
    return () => unsubs.forEach(u => u());
  }, [on, loadData]);

  useEffect(() => {
    loadData(true);
  }, []); // Only on mount

  useEffect(() => {
    if (activeTab === "VERSIONS") loadVersions();
  }, [activeTab, loadVersions]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStock = (item: any) => {
    const itemId = item.id;
    const currentStockStatus = item.outOfStock;
    const currentPending = pendingStock[itemId];
    
    // Determine what the "new" status would be
    const nextStatus = currentPending !== undefined ? !currentPending : !currentStockStatus;
    
    setPendingStock(prev => {
      const updated: Record<string, boolean> = { ...prev, [itemId]: nextStatus };
      // If the next status is the same as the original database status, remove from pending
      if (nextStatus === currentStockStatus) {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const handleBulkStockSave = async () => {
    if (Object.keys(pendingStock).length === 0) return;
    setSavingStock(true);
    try {
      const updates = Object.entries(pendingStock).map(([id, outOfStock]) => ({ id, outOfStock }));
      await adminBulkUpdateStock(updates, secret);
      setPendingStock({}); // Clear immediately so Save Bar hides
      
      const count = updates.length;
      showToast(`Successfully updated stock for ${count} item${count > 1 ? "s" : ""}`);
      await loadData(false);
    } catch (err) {
      showToast("Failed to save changes", "error");
    } finally {
      setSavingStock(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingItem(true);
    try {
      let finalItem = { ...editingItem };

      // 1. Handle image upload if a new file is selected
      if (selectedFile) {
        try {
          const uploadRes = await adminUploadImage(selectedFile, editingItem.name || "item", secret);
          if (uploadRes.success) {
            finalItem.image = uploadRes.path;
          }
        } catch (err) {
          showToast("Image upload failed", "error");
          setSavingItem(false);
          return;
        }
      }

      // 2. Save the item
      if (editingItem.id === "NEW") {
        await adminCreateMenuItem(finalItem, secret);
        showToast("Item created");
      } else {
        await adminUpdateMenuItem(editingItem.id, finalItem, secret);
        showToast("Item updated");
      }
      setEditingItem(null);
      setSelectedFile(null);
      loadData(false);
    } catch (err) {
      showToast("Save failed", "error");
    } finally {
      setSavingItem(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSavingCategory(true);
    try {
      if (editingCategory.id === "NEW") {
        await adminCreateCategory(editingCategory.name, editingCategory.sortOrder, secret);
        showToast("Category created");
      } else {
        await adminUpdateCategory(editingCategory.id, editingCategory, secret);
        showToast("Category updated");
      }
      setEditingCategory(null);
      loadData(false);
    } catch (err) {
      showToast("Save failed", "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await adminDeleteMenuItem(itemToDelete.id, secret);
      showToast("Item deleted");
      setItemToDelete(null);
      loadData(false);
    } catch (err) {
      showToast("Delete failed", "error");
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm("Rollback menu to this version? This will overwrite all current changes.")) return;
    try {
      await adminRollbackMenu(versionId, secret);
      showToast("Menu rolled back successfully");
      await loadData(false);
      setActiveTab("ITEMS");
    } catch (err) {
      showToast("Rollback failed", "error");
    }
  };

  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const pendingCount = Object.keys(pendingStock).length;

  return (
    <div className="flex flex-col h-full relative">
      {/* Sub-header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 px-2"
      >
        <div className="flex bg-white p-1.5 rounded-2xl border border-[#3A241C]/5 shadow-sm overflow-x-auto no-scrollbar max-w-full relative">
          {refreshing && (
            <div className="absolute top-0 right-0 p-1">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border-2 border-[#E76F51] border-t-transparent rounded-full" 
              />
            </div>
          )}
          <div className="flex min-w-max items-center">
            {[
              { id: "ITEMS", label: "Menu Items", icon: UtensilsCrossed },
              { id: "CATEGORIES", label: "Categories", icon: Settings2 },
              { id: "VERSIONS", label: "History", icon: History },
            ].map(tab => (
              <motion.button
                whileTap={{ scale: 0.95 }}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold text-[10px] md:text-xs transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-[#3A241C] text-white shadow-lg" : "text-[#3A241C]/40 hover:bg-[#F9F7F4] hover:text-[#3A241C]"}`}
              >
                <tab.icon size={14} className="md:w-4 md:h-4" />
                {tab.label}
              </motion.button>
            ))}


          </div>
        </div>

        {activeTab === "ITEMS" && (
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A241C]/20" size={18} />
              <input 
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#3A241C]/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#E76F51]/20 transition-all"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditingItem({ id: "NEW", name: "", price: 0, categoryId: categories[0]?.id, descriptionEn: "", descriptionHi: "", outOfStock: false, variants: [], variantPrices: {}, outOfStockVariants: [] })}
              className="bg-[#E76F51] text-white p-3 rounded-2xl shadow-lg shadow-[#E76F51]/20 transition-all"
            >
              <Plus size={24} />
            </motion.button>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-[#E76F51]"
          />
        </div>
      ) : (
        <>
          {/* Floating Category Quick Nav (Fixed on Right) */}
          <AnimatePresence>
            {categories.length > 0 && (
              <motion.div 
                initial={{ x: 200, opacity: 0 }}
                animate={{ 
                  x: isQuickNavOpen ? 0 : 200, 
                  opacity: 1 
                }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] hidden xl:flex items-center"
              >
                <div className="bg-white/90 backdrop-blur-xl rounded-l-[3rem] border border-[#3A241C]/5 shadow-[0_20px_70px_-10px_rgba(58,36,28,0.15)] flex items-center p-2 border-r-0">
                  {/* Integrated Toggle Button */}
                  <button
                    onClick={() => setIsQuickNavOpen(!isQuickNavOpen)}
                    className="w-10 h-10 rounded-full bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/40 hover:bg-[#E76F51] hover:text-white transition-all duration-300 mr-2 shrink-0"
                  >
                    <motion.div
                      animate={{ rotate: isQuickNavOpen ? 0 : 180 }}
                      transition={{ duration: 0.4, ease: "anticipate" }}
                    >
                      <ChevronRight size={20} />
                    </motion.div>
                  </button>

                  <div className={`w-48 transition-opacity duration-300 ${isQuickNavOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div className="px-3 pb-3 border-b border-[#3A241C]/5 mb-2">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/30">Quick Navigation</h4>
                    </div>
                    <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                      {categories.map(cat => (
                        <motion.button
                          key={`fixed-nav-${cat.id}`}
                          whileHover={{ x: -4, color: "#E76F51" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (activeTab !== "ITEMS") {
                              setActiveTab("ITEMS");
                              setTimeout(() => {
                                const el = document.getElementById(`category-${cat.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            } else {
                              const el = document.getElementById(`category-${cat.id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className="w-full text-right px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 hover:bg-[#E76F51]/5 transition-all truncate"
                        >
                          {cat.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 pr-2 md:pr-12 pb-16 px-1 md:px-2"
          >
          {activeTab === "ITEMS" && (
            <div className="space-y-6">
              {categories.map(cat => {
                const catItems = cat.items.filter((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
                if (catItems.length === 0 && searchQuery) return null;

                return (
                  <motion.div 
                    variants={itemVariants} 
                    key={cat.id}
                    className="mb-6 pt-2"
                    id={`category-${cat.id}`}
                  >
                    <div className="flex items-center justify-between mb-8 group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <h3 className="text-2xl font-black text-[#3A241C] relative z-10">
                            {cat.name}
                          </h3>
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: "100%" }}
                            className="absolute -bottom-1 left-0 h-2 bg-[#E76F51]/10 rounded-full -z-0"
                          />
                        </div>
                        <span className="text-[10px] font-black text-[#3A241C]/30 bg-white border border-[#3A241C]/5 px-3 py-1 rounded-full shadow-sm">
                          {catItems.length} Items
                        </span>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowBulkDiscount(cat.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E76F51] border border-[#E76F51]/10 hover:bg-[#E76F51] hover:text-white transition-all shadow-sm"
                      >
                        <Tag size={12} />
                        Bulk Discount
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {catItems.map((item: any) => {
                        const isPending = pendingStock[item.id] !== undefined;
                        const currentStatus = isPending ? pendingStock[item.id] : item.outOfStock;

                        return (
                          <motion.div 
                            layout
                            whileHover={{ y: -4 }}
                            key={item.id}
                            className={`bg-white p-4 rounded-[1.5rem] border transition-all duration-300 flex flex-col gap-2 ${currentStatus ? "border-[#3A241C]/20 bg-[#F9F7F4]/30" : "border-[#3A241C]/5 shadow-sm"} ${isPending ? "ring-2 ring-[#E76F51]/50 border-[#E76F51]/30" : ""}`}
                          >
                            <div className="flex gap-3 items-center">
                              <div className="w-16 h-16 bg-[#F9F7F4] rounded-xl flex-shrink-0 relative overflow-hidden border border-[#3A241C]/5">
                                {item.image ? (
                                  <Image src={item.image} alt={item.name} fill className={`object-cover ${currentStatus ? "grayscale opacity-50" : ""}`} />
                                ) : (
                                  <UtensilsCrossed size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#3A241C]/10" />
                                )}
                                {isPending && (
                                  <div className="absolute top-1 right-1">
                                    <div className="w-2 h-2 bg-[#E76F51] rounded-full shadow-sm animate-pulse" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                                <div className="flex justify-between items-start mb-0.5">
                                  <h4 className={`font-bold text-[#3A241C] text-[13px] leading-tight truncate pr-2 ${currentStatus ? "opacity-40" : ""}`} title={item.name}>{item.name}</h4>
                                  <div className="flex items-center shrink-0 -mt-1 -mr-1">
                                    <motion.button whileTap={{ scale: 0.8 }} onClick={() => setEditingItem({ ...item, variants: item.variants || [], variantPrices: item.variantPrices || {}, outOfStockVariants: item.outOfStockVariants || [] })} className="p-1.5 text-[#3A241C]/20 hover:text-[#E76F51] transition-colors"><Edit2 size={13} /></motion.button>
                                    <motion.button whileTap={{ scale: 0.8 }} onClick={() => setItemToDelete(item)} className="p-1.5 text-[#3A241C]/20 hover:text-[#B71C1C] transition-colors"><Trash2 size={13} /></motion.button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`font-black text-[#E76F51] text-xs ${currentStatus ? "opacity-40" : ""}`}>₹{item.price}</span>
                                  {item.discountPct && <span className="text-[8px] font-black bg-[#6A994E] text-white px-1 py-0.5 rounded-sm">-{item.discountPct}%</span>}
                                </div>
                                <div className="flex gap-2">
                                  <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleToggleStock(item)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all w-max ${currentStatus ? "bg-[#3A241C] text-white" : "bg-[#F9F7F4] text-[#3A241C]/40 hover:bg-[#3A241C]/5 hover:text-[#3A241C]"} ${isPending ? "ring-2 ring-[#E76F51]/50 ring-inset" : "border border-transparent"}`}
                                  >
                                    {currentStatus ? <Eye size={10} /> : <EyeOff size={10} />}
                                    {currentStatus ? "In Stock" : "Out of Stock"}
                                  </motion.button>
                                  <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => alert('Featured functionality coming soon!')}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all w-max bg-[#F9F7F4] text-[#3A241C]/40 hover:bg-yellow-50 hover:text-yellow-600 border border-transparent"
                                  >
                                    <Star size={10} />
                                    Featured
                                  </motion.button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeTab === "CATEGORIES" && (
            <div className="max-w-2xl bg-white rounded-[2.5rem] border border-[#3A241C]/5 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-[#3A241C]/5 flex justify-between items-center">
                <h3 className="font-black text-[#3A241C] uppercase tracking-widest text-xs">Categories Management</h3>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingCategory({ id: "NEW", name: "", sortOrder: categories.length })}
                  className="bg-[#E76F51] text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#E76F51]/20 transition-all"
                >
                  Add Category
                </motion.button>
              </div>
              <div className="divide-y divide-[#3A241C]/5">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="p-6 flex items-center justify-between hover:bg-[#F9F7F4]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-[#3A241C]/5 rounded-lg flex items-center justify-center text-[10px] font-black text-[#3A241C]/20">{cat.sortOrder}</span>
                      <span className="font-bold text-[#3A241C]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button whileTap={{ scale: 0.8 }} onClick={() => setEditingCategory(cat)} className="p-3 text-[#3A241C]/20 hover:text-[#3A241C] transition-colors"><Edit2 size={18} /></motion.button>
                      <motion.button whileTap={{ scale: 0.8 }} onClick={() => { setItemToDelete({ ...cat, isCategory: true }); }} className="p-3 text-[#3A241C]/20 hover:text-[#B71C1C] transition-colors"><Trash2 size={18} /></motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "VERSIONS" && (
            <div className="max-w-4xl space-y-4">
              {versions.map(v => {
                const isExpanded = expandedVersion === v.id;
                const snapshot = v.snapshot ? JSON.parse(v.snapshot) : null;
                
                return (
                  <div key={v.id} className="bg-white rounded-[2.5rem] border border-[#3A241C]/5 shadow-sm overflow-hidden transition-all duration-300">
                    <div 
                      onClick={() => setExpandedVersion(isExpanded ? null : v.id)}
                      className="p-6 flex items-center justify-between cursor-pointer hover:bg-[#F9F7F4]/50"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-[#F9F7F4] rounded-2xl flex items-center justify-center">
                          <History size={20} className="text-[#3A241C]/20" />
                        </div>
                        <div>
                          <p className="font-bold text-[#3A241C]">{v.note?.replace(/ item:/g, ":").replace(/ category:/g, " Category:") || "Manual update"}</p>
                          <p className="text-[10px] font-medium text-[#3A241C]/40 uppercase tracking-widest">
                            {new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric' })} • {new Date(v.createdAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); handleRollback(v.id); }}
                          className="flex items-center gap-2 px-6 py-3 bg-[#3A241C] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-[#3A241C]/10"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </motion.button>
                        <ChevronRight size={20} className={`text-[#3A241C]/20 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-[#3A241C]/5 bg-[#F9F7F4]/30"
                        >
                          <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Array.isArray(snapshot) && snapshot.map((cat: any) => (
                              <div key={cat.id} className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#E76F51]">{cat.name}</p>
                                <p className="text-xs font-bold text-[#3A241C]/60">{cat.items?.length || 0} Items</p>
                              </div>
                            ))}
                            {(!Array.isArray(snapshot) || snapshot.length === 0) && (
                              <p className="text-xs font-medium text-[#3A241C]/30 col-span-full">No snapshot data available for this version.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
        </>
      )}

      {/* Floating Save Bar */}
      <AnimatePresence>
        {pendingCount > 0 && !toast && (
          <motion.div 
            initial={{ y: 100, x: "-50%", opacity: 0 }} 
            animate={{ y: 0, x: "-50%", opacity: 1 }} 
            exit={{ y: 100, x: "-50%", opacity: 0 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 z-[110] w-[95%] max-w-lg bg-[#3A241C] text-white p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="flex items-center gap-3 md:gap-4 ml-2 md:ml-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#E76F51] rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest truncate">{pendingCount} Change{pendingCount > 1 ? "s" : ""} Marked</p>
                <p className="hidden md:block text-[9px] text-white/40 font-bold uppercase tracking-tighter">Click save to push updates</p>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 flex-shrink-0">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setPendingStock({})}
                className="px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Reset
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBulkStockSave}
                disabled={savingStock}
                className="bg-[#E76F51] px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-[#E76F51]/40 transition-all disabled:opacity-50"
              >
                {savingStock ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Editor Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingItem(null)} className="absolute inset-0 bg-[#3A241C]/80 backdrop-blur-xl" />
            <motion.form 
              onSubmit={handleSaveItem}
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 lg:p-10 border-b border-[#3A241C]/5 flex justify-between items-center bg-[#F9F7F4]/50">
                <div>
                  <h3 className="text-2xl font-black text-[#3A241C] tracking-tight">{editingItem.id === "NEW" ? "New Item" : "Edit Item"}</h3>
                  <p className="text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest mt-1">Fill in the details below</p>
                </div>
                <button type="button" onClick={() => { setEditingItem(null); setSelectedFile(null); }} className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#3A241C]/20 hover:text-[#3A241C] shadow-sm"><X size={24} /></button>
              </div>

              <div className="p-8 lg:p-10 overflow-y-auto space-y-8 flex-1">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Item Name</label>
                    <input 
                      required
                      value={editingItem.name}
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Price (₹)</label>
                    <input 
                      required type="number"
                      value={editingItem.price}
                      onChange={e => setEditingItem({...editingItem, price: e.target.value})}
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Volume (ml)</label>
                    <input 
                      value={editingItem.volume || ""}
                      onChange={e => setEditingItem({...editingItem, volume: e.target.value})}
                      placeholder="e.g. 250 ml"
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col space-y-4">
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Category</label>
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                          className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51] flex items-center justify-between"
                        >
                          {categories.find(c => c.id === editingItem.categoryId)?.name || "Select Category"}
                          <ChevronRight size={18} className={`transition-transform duration-300 ${catDropdownOpen ? "rotate-90" : ""}`} />
                        </button>
                        
                        <CustomCategoryDropdown 
                          isOpen={catDropdownOpen}
                          categories={categories}
                          selectedId={editingItem.categoryId}
                          onSelect={(id) => {
                            setEditingItem({...editingItem, categoryId: id});
                            setCatDropdownOpen(false);
                          }}
                          onAddNew={() => {
                            setCatDropdownOpen(false);
                            setEditingCategory({ id: "NEW", name: "", sortOrder: categories.length });
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Image Preview Block inside left column */}
                    {(selectedFile ? URL.createObjectURL(selectedFile) : editingItem.image) && (
                      <div className="flex flex-col gap-2 p-4 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
                          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#3A241C]/30 mb-1">Preview in Card</p>
                          <div className="bg-white rounded-[2rem] p-3 border border-[#3A241C]/5 flex items-center gap-3">
                            <div className="w-[84px] h-[84px] rounded-2xl bg-[#F9F7F4] flex-shrink-0 overflow-hidden relative border border-[#3A241C]/5">
                              <Image src={(selectedFile ? URL.createObjectURL(selectedFile) : editingItem.image)!} alt="Card Preview" fill className="object-cover" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between h-[84px] py-1 min-w-0">
                              <div className="min-w-0">
                                <h3 className="font-black text-[#3A241C] text-[11px] tracking-tight line-clamp-2 leading-tight">
                                  {editingItem.name || "Item Name"}
                                </h3>
                                {(editingItem.descriptionEn || editingItem.descriptionHi || !editingItem.name) && (
                                  <p className="text-[9px] text-[#3A241C]/50 leading-[1.3] mt-1 font-medium tracking-[0.02em] line-clamp-2">
                                    {editingItem.descriptionEn || editingItem.descriptionHi || "Item description will appear here"}
                                  </p>
                                )}
                              </div>
                              <div className="mt-auto">
                                <span className="font-black text-xs text-[#E76F51] tracking-tight">
                                  ₹{editingItem.price || "0"}
                                </span>
                              </div>
                            </div>
                          </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-full">
                    <ImageUpload 
                      currentImage={editingItem.image || null}
                      onFileSelect={setSelectedFile}
                      onReset={() => {
                        setSelectedFile(null);
                        setEditingItem({ ...editingItem, image: null });
                      }}
                    />
                  </div>
                </div>

                {/* Variants Section */}
                <div className="space-y-4 pt-6 border-t border-[#3A241C]/5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40">Variants (e.g. Coke, Sprite)</label>
                    <button 
                      type="button" 
                      onClick={() => setVariantToEdit({ index: "NEW", name: "", price: editingItem.price, volume: "" })}
                      className="text-[10px] font-black text-[#E76F51] uppercase tracking-widest hover:underline"
                    >
                      + Add Variant
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {editingItem.variants?.map((v: string) => {
                      const isOOS = editingItem.outOfStockVariants?.includes(v);
                      return (
                        <div key={v} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isOOS ? "bg-red-50 border-red-100 opacity-60" : "bg-[#F9F7F4] border-[#3A241C]/5"}`}>
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={!isOOS}
                              onChange={(e) => {
                                const newOOS = e.target.checked 
                                  ? (editingItem.outOfStockVariants || []).filter((name: string) => name !== v)
                                  : [...(editingItem.outOfStockVariants || []), v];
                                setEditingItem({ ...editingItem, outOfStockVariants: newOOS });
                              }}
                              className="w-4 h-4 accent-[#6A994E]"
                            />
                            <div className="min-w-0" onClick={() => setVariantToEdit({ index: editingItem.variants.indexOf(v), name: v, price: (editingItem.variantPrices?.[v] as any)?.price || editingItem.variantPrices?.[v] || editingItem.price, volume: (editingItem.variantPrices?.[v] as any)?.volume || "" })}>
                              <p className={`text-xs font-bold ${isOOS ? "text-red-900 line-through" : "text-[#3A241C]"} truncate`}>{v}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black text-[#E76F51]">₹{(editingItem.variantPrices?.[v] as any)?.price || editingItem.variantPrices?.[v] || editingItem.price}</p>
                                {(editingItem.variantPrices?.[v] as any)?.volume && <p className="text-[9px] font-bold text-[#3A241C]/40">{(editingItem.variantPrices?.[v] as any).volume}</p>}
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              const newVariants = editingItem.variants.filter((name: string) => name !== v);
                              const newPrices = { ...editingItem.variantPrices };
                              delete newPrices[v];
                              const newOOS = (editingItem.outOfStockVariants || []).filter((name: string) => name !== v);
                              setEditingItem({ ...editingItem, variants: newVariants, variantPrices: newPrices, outOfStockVariants: newOOS });
                            }}
                            className="p-2 text-[#3A241C]/20 hover:text-[#B71C1C]"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Description (English)</label>
                    <textarea 
                      rows={2}
                      value={editingItem.descriptionEn || ""}
                      onChange={e => {
                        const val = e.target.value;
                        const nextItem = { ...editingItem, descriptionEn: val };
                        if ((!editingItem.descriptionHi || editingItem.descriptionHi === editingItem.descriptionEn) && editingItem.id === "NEW") {
                          nextItem.descriptionHi = val;
                        }
                        setEditingItem(nextItem);
                      }}
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-medium outline-none focus:ring-2 focus:ring-[#E76F51] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Description (Hindi)</label>
                    <textarea 
                      rows={2}
                      value={editingItem.descriptionHi || ""}
                      onChange={e => setEditingItem({...editingItem, descriptionHi: e.target.value})}
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-medium outline-none focus:ring-2 focus:ring-[#E76F51] resize-none font-hindi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#3A241C]/5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#6A994E] ml-1">Discount (%)</label>
                    <input 
                      type="number"
                      value={editingItem.discountPct || ""}
                      onChange={e => setEditingItem({...editingItem, discountPct: e.target.value ? parseInt(e.target.value) : null})}
                      placeholder="0"
                      className="w-full bg-[#6A994E]/5 border border-[#6A994E]/10 rounded-2xl py-4 px-6 text-[#6A994E] font-bold outline-none focus:ring-2 focus:ring-[#6A994E]"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center gap-3 bg-[#F9F7F4] p-4 rounded-2xl w-full">
                      <input 
                        type="checkbox"
                        checked={editingItem.outOfStock}
                        onChange={e => setEditingItem({...editingItem, outOfStock: e.target.checked})}
                        className="w-5 h-5 accent-[#3A241C]"
                      />
                      <span className="text-xs font-bold text-[#3A241C]">Mark as Out of Stock</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 lg:p-10 bg-[#F9F7F4]/50 border-t border-[#3A241C]/5 flex gap-4">
                <button type="button" disabled={savingItem} onClick={() => { setEditingItem(null); setSelectedFile(null); }} className="flex-1 py-4 bg-white border border-[#3A241C]/5 text-[#3A241C]/40 rounded-2xl font-bold text-sm hover:text-[#3A241C] transition-all disabled:opacity-50">Discard</button>
                <button 
                  type="submit" 
                  disabled={savingItem}
                  className="flex-1 py-4 bg-[#3A241C] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#3A241C]/20 flex items-center justify-center gap-2 hover:bg-[#E76F51] transition-all disabled:opacity-50"
                >
                  {savingItem ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {savingItem ? "Saving..." : "Save Item"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Discount Modal */}
      <AnimatePresence>
        {showBulkDiscount && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkDiscount(null)} className="absolute inset-0 bg-[#3A241C]/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-[#6A994E]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Tag size={32} className="text-[#6A994E]" />
              </div>
              <h3 className="text-2xl font-black text-[#3A241C] tracking-tight mb-2">Category Discount</h3>
              <p className="text-xs text-[#3A241C]/40 font-medium mb-8">Apply a percentage discount to all items in this category that don't have individual discounts.</p>
              
              <div className="space-y-6">
                <div className="relative">
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#3A241C]">%</span>
                  <input 
                    id="bulk-disc-input"
                    type="number"
                    placeholder="Enter percentage"
                    className="w-full bg-[#F9F7F4] border-none rounded-2xl py-5 px-8 text-center font-black text-2xl text-[#3A241C] outline-none ring-2 ring-transparent focus:ring-[#6A994E]"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      const val = (document.getElementById('bulk-disc-input') as HTMLInputElement).value;
                      if(val) adminBulkDiscount(showBulkDiscount, { discountPct: parseInt(val) }, secret).then(() => { showToast("Bulk discount applied"); setShowBulkDiscount(null); loadData(); });
                    }}
                    className="w-full py-5 bg-[#3A241C] text-white rounded-2xl font-bold shadow-xl shadow-[#3A241C]/10 hover:bg-[#6A994E] transition-all"
                  >
                    Apply Discount
                  </button>
                  <button 
                    onClick={() => adminBulkDiscount(showBulkDiscount, { clear: true }, secret).then(() => { showToast("Category discounts cleared"); setShowBulkDiscount(null); loadData(); })}
                    className="w-full py-4 text-[#B71C1C] font-bold text-xs uppercase tracking-widest hover:bg-[#B71C1C]/5 rounded-xl transition-all"
                  >
                    Clear All Discounts
                  </button>
                  <button onClick={() => setShowBulkDiscount(null)} className="mt-2 text-[#3A241C]/20 font-bold text-[10px] uppercase tracking-widest hover:text-[#3A241C]">Close</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Category Editor Modal */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCategory(null)} className="absolute inset-0 bg-[#3A241C]/80 backdrop-blur-xl" />
            <motion.form 
              onSubmit={handleSaveCategory}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl flex flex-col"
            >
              <h3 className="text-2xl font-black text-[#3A241C] tracking-tight mb-8 font-hindi">{editingCategory.id === "NEW" ? "नई कैटेगरी" : "कैटेगरी संपादित करें"}</h3>
              
              <div className="space-y-6 mb-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Category Name</label>
                  <input 
                    required 
                    value={editingCategory.name}
                    onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                    className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-black outline-none focus:ring-2 focus:ring-[#E76F51]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-1">Sort Order</label>
                  <input 
                    type="number"
                    value={editingCategory.sortOrder}
                    onChange={e => setEditingCategory({...editingCategory, sortOrder: parseInt(e.target.value)})}
                    className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-black outline-none focus:ring-2 focus:ring-[#E76F51]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={savingCategory}
                  className="w-full py-5 bg-[#3A241C] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#3A241C]/10 hover:bg-[#E76F51] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {savingCategory ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {savingCategory ? "इंतज़ार करें..." : "सेव करें / Save"}
                </button>
                <button type="button" disabled={savingCategory} onClick={() => setEditingCategory(null)} className="py-4 text-[#3A241C]/20 font-black text-[10px] uppercase tracking-widest hover:text-[#3A241C] transition-all">रद्द करें / Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Variant Edit Modal */}
      <AnimatePresence>
        {variantToEdit && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVariantToEdit(null)} className="absolute inset-0 bg-[#3A241C]/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black text-[#3A241C] mb-6">{variantToEdit.index === "NEW" ? "Add Variant" : "Edit Variant"}</h3>
              <div className="space-y-4 mb-8">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-2">Variant Name</label>
                  <input 
                    required placeholder="e.g. Sprite"
                    value={variantToEdit.name}
                    onChange={e => setVariantToEdit({...variantToEdit, name: e.target.value})}
                    className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-2">Price (₹)</label>
                    <input 
                      required type="number" placeholder="20"
                      value={variantToEdit.price}
                      onChange={e => setVariantToEdit({...variantToEdit, price: parseInt(e.target.value)})}
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-2">Volume (e.g. 250 ml)</label>
                    <input 
                      placeholder="250 ml"
                      value={variantToEdit.volume}
                      onChange={e => setVariantToEdit({...variantToEdit, volume: e.target.value})}
                      className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 px-6 text-[#3A241C] font-bold outline-none focus:ring-2 focus:ring-[#E76F51]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setVariantToEdit(null)} className="flex-1 py-4 bg-[#F9F7F4] text-[#3A241C]/40 rounded-2xl font-bold">Cancel</button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (!variantToEdit.name) return;
                    const nextItem = { ...editingItem };
                    const vData = { price: variantToEdit.price, volume: variantToEdit.volume };
                    
                    if (variantToEdit.index === "NEW") {
                      nextItem.variants = [...(nextItem.variants || []), variantToEdit.name];
                      nextItem.variantPrices = { ...(nextItem.variantPrices || {}), [variantToEdit.name]: vData };
                    } else {
                      const oldName = nextItem.variants[variantToEdit.index];
                      const newVariants = [...nextItem.variants];
                      newVariants[variantToEdit.index] = variantToEdit.name;
                      nextItem.variants = newVariants;
                      
                      const newPrices = { ...nextItem.variantPrices };
                      delete newPrices[oldName];
                      newPrices[variantToEdit.name] = vData;
                      nextItem.variantPrices = newPrices;
                    }
                    setEditingItem(nextItem);
                    setVariantToEdit(null);
                  }}
                  className="flex-1 py-4 bg-[#3A241C] text-white rounded-2xl font-bold shadow-lg"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setItemToDelete(null)} className="absolute inset-0 bg-[#3A241C]/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} className="text-[#B71C1C]" />
              </div>
              <h3 className="text-2xl font-black text-[#3A241C] mb-2">Are you sure?</h3>
              <p className="text-xs text-[#3A241C]/40 font-medium mb-8">
                You are about to delete <span className="text-[#3A241C] font-black">"{itemToDelete.name}"</span>. 
                This action cannot be undone.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      if (itemToDelete.isCategory) {
                        await adminDeleteCategory(itemToDelete.id, secret);
                        showToast("Category deleted");
                        loadData(false);
                      } else {
                        await handleDeleteConfirm();
                      }
                      setItemToDelete(null);
                    } catch (err) {
                      showToast("Delete failed", "error");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="w-full py-5 bg-[#B71C1C] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isDeleting ? "Deleting..." : "Yes, Delete Permanently"}
                </button>
                <button disabled={isDeleting} onClick={() => setItemToDelete(null)} className="py-4 text-[#3A241C]/20 font-black text-[10px] uppercase tracking-widest hover:text-[#3A241C]">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "error" ? "bg-[#B71C1C] text-white border-white/20" : "bg-[#3A241C] text-white border-white/10"}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === "error" ? "bg-white/20" : "bg-[#E76F51]"}`}>
              {toast.type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}
            </div>
            <span className="font-bold text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(58, 36, 28, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(58, 36, 28, 0.1); }
      `}</style>
    </div>
  );
}

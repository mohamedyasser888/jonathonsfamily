"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useToast } from "@/components/Toast";
import AdminImage from "@/components/AdminImage";
import CollectionDownloadButtons from "@/components/CollectionDownloadButtons";
import CollectionAvailabilityPicker from "@/components/CollectionAvailabilityPicker";
import type { CollectionAvailability } from "@/lib/collection-availability";
import type { Collection, Product, Ticket } from "@/lib/types/profile";
import { filterImageFiles, isImageFile } from "@/lib/image-files";
import {
  MAGICAL_PRICE_HINT,
  parseMagicalPrice,
  formatPriceDisplay,
} from "@/lib/magical-price";
import PriceDisplay from "@/components/PriceDisplay";
import AdminTicketsPanel from "./AdminTicketsPanel";
import UserListSidebar from "@/components/UserListSidebar";
import AdminInboxPanel from "@/components/AdminInboxPanel";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"collections" | "products" | "tickets" | "inbox">("collections");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserSidebar, setShowUserSidebar] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Collections form state
  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colFile, setColFile] = useState<File | null>(null);
  const [colPreview, setColPreview] = useState("");
  const [colGalleryFiles, setColGalleryFiles] = useState<File[]>([]);
  const [colGalleryPreviews, setColGalleryPreviews] = useState<string[]>([]);
  const [colUploadProgress, setColUploadProgress] = useState<string | null>(null);
  const [colDefaultPrice, setColDefaultPrice] = useState("k");

  const [manageColId, setManageColId] = useState("");
  const [manageBulkPrice, setManageBulkPrice] = useState("");
  const [manageFolderFiles, setManageFolderFiles] = useState<File[]>([]);
  const [manageFolderPreviews, setManageFolderPreviews] = useState<string[]>([]);

  // Products form state
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodColId, setProdColId] = useState("");
  const [prodFile, setProdFile] = useState<File | null>(null);
  const [prodPreview, setProdPreview] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    async function refreshTicketCount() {
      const res = await fetch("/api/admin/tickets", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setTicketCount(data.filter((t: Ticket) => t.status !== "deleted").length);
      }
    }
    refreshTicketCount();
    const interval = setInterval(refreshTicketCount, 4000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    setFetchLoading(true);
    try {
      const [colRes, prodRes, tickRes] = await Promise.all([
        fetch("/api/admin/collections"),
        fetch("/api/admin/products"),
        fetch("/api/admin/tickets", { cache: "no-store" }),
      ]);

      if (colRes.ok) setCollections(await colRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (tickRes.ok) {
        const allTickets = await tickRes.json();
        setTicketCount(
          Array.isArray(allTickets)
            ? allTickets.filter((t: Ticket) => t.status !== "deleted").length
            : 0
        );
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast("Error loading admin records", "error");
    } finally {
      setFetchLoading(false);
    }
  }

  // Handle image upload helper
  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "File upload failed");
    }

    const data = await res.json();
    return data.url;
  }

  function pickFolderImages(
    fileList: FileList | null,
    onPicked: (files: File[]) => void
  ) {
    const all = Array.from(fileList || []);
    const images = filterImageFiles(all);
    if (images.length > 0) {
      toast(`Loaded ${images.length} image(s) (PNG, JPG, WebP, etc.)`, "success");
    } else if (all.length > 0) {
      toast(
        `Found ${all.length} file(s) but no images. Use .png, .jpg, .webp, etc.`,
        "error"
      );
    }
    onPicked(images);
  }

  function loadFilePreviews(files: File[], setter: (urls: string[]) => void) {
    if (files.length === 0) {
      setter([]);
      return;
    }
    const previews: string[] = [];
    let loaded = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        loaded++;
        if (loaded === files.length) setter([...previews]);
      };
      reader.readAsDataURL(file);
    });
  }

  // Submit Collection
  async function handleColSubmit(e: FormEvent) {
    e.preventDefault();
    if (!colName.trim()) return;
    setLoading(true);
    setColUploadProgress("Initiating collection upload...");

    try {
      let imageUrl = "";
      if (colFile) {
        setColUploadProgress("Uploading main thumbnail image...");
        imageUrl = await uploadImage(colFile);
      }

      // Upload gallery images in sequence
      const galleryUrls: string[] = [];
      if (colGalleryFiles.length > 0) {
        for (let i = 0; i < colGalleryFiles.length; i++) {
          setColUploadProgress(`Uploading gallery image ${i + 1} of ${colGalleryFiles.length}...`);
          const url = await uploadImage(colGalleryFiles[i]);
          galleryUrls.push(url);
        }
      }

      setColUploadProgress("Creating collection in database...");

      const parsedPrice = parseMagicalPrice(colDefaultPrice);
      if (!parsedPrice.valid) {
        throw new Error(parsedPrice.error);
      }

      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: colName.trim(),
          description: colDesc.trim(),
          image_url: imageUrl || galleryUrls[0] || null,
          images: galleryUrls,
          image_names: colGalleryFiles.map((f) => f.name),
          default_price: parsedPrice.storage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create collection");
      }

      const result = await res.json();
      toast(
        galleryUrls.length > 0
          ? `Folder created with ${galleryUrls.length} picture(s) as products.`
          : "Empty folder created (no pictures inside).",
        "success"
      );
      setColName("");
      setColDesc("");
      setColFile(null);
      setColPreview("");
      setColGalleryFiles([]);
      setColGalleryPreviews([]);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Failed to create collection", "error");
    } finally {
      setLoading(false);
      setColUploadProgress(null);
    }
  }

  async function handleApplyPriceToAll() {
    if (!manageColId) {
      toast("Select a collection folder first", "info");
      return;
    }
    console.log("[handleApplyPriceToAll] Collection ID:", manageColId);
    console.log("[handleApplyPriceToAll] Bulk price:", manageBulkPrice);
    console.log("[handleApplyPriceToAll] Default price:", colDefaultPrice);

    const priceParsed = parseMagicalPrice(manageBulkPrice || colDefaultPrice);
    if (!priceParsed.valid) {
      console.log("[handleApplyPriceToAll] Invalid price:", priceParsed.error);
      toast(priceParsed.error, "error");
      return;
    }
    console.log("[handleApplyPriceToAll] Parsed price storage:", priceParsed.storage);
    console.log("[handleApplyPriceToAll] Parsed price numeric:", priceParsed.numeric);

    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_id: manageColId,
          price: priceParsed.numeric,
        }),
      });

      console.log("[handleApplyPriceToAll] Response status:", res.status);
      console.log("[handleApplyPriceToAll] Response ok:", res.ok);

      const data = await res.json();
      console.log("[handleApplyPriceToAll] Response data:", data);

      if (!res.ok) throw new Error(data.error || "Failed to update prices");
      toast(
        `Price ${formatPriceDisplay(priceParsed.storage)} applied to ${data.updated} item(s).`,
        "success"
      );
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      console.error("[handleApplyPriceToAll] Error:", err);
      console.error("[handleApplyPriceToAll] Error message:", message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFilesToFolder() {
    if (!manageColId) {
      toast("Select a collection folder first", "info");
      return;
    }
    if (manageFolderFiles.length === 0) {
      toast("Choose a folder or image files to add", "info");
      return;
    }
    setLoading(true);
    setColUploadProgress("Adding files to folder...");
    try {
      const urls: string[] = [];
      for (let i = 0; i < manageFolderFiles.length; i++) {
        setColUploadProgress(`Uploading ${i + 1} / ${manageFolderFiles.length}...`);
        urls.push(await uploadImage(manageFolderFiles[i]));
      }
      const parsedPrice = parseMagicalPrice(manageBulkPrice || colDefaultPrice);
      if (!parsedPrice.valid) {
        throw new Error(parsedPrice.error);
      }

      const res = await fetch(`/api/admin/collections/${manageColId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: urls,
          image_names: manageFolderFiles.map((f) => f.name),
          default_price: parsedPrice.storage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update folder");

      toast(
        `Added ${urls.length} file(s). ${data.products_created} new product(s) created.`,
        "success"
      );
      setManageFolderFiles([]);
      setManageFolderPreviews([]);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      toast(message, "error");
    } finally {
      setLoading(false);
      setColUploadProgress(null);
    }
  }

  async function handleSetAvailability(
    collectionId: string,
    status: CollectionAvailability
  ) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability_status: status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, availability_status: status } : c
        )
      );
      toast("Store status updated", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishCollection(collectionId: string, collectionName: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      toast(`"${collectionName}" is live for users`, "success");
      fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Publish failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCollection(collectionId: string, collectionName: string) {
    if (
      !confirm(
        `Delete folder "${collectionName}" and all its pictures and products? This cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (manageColId === collectionId) {
        setManageColId("");
        setManageFolderFiles([]);
        setManageFolderPreviews([]);
      }
      toast(`Deleted folder "${collectionName}"`, "info");
      fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFolderImage(imageUrl: string) {
    if (!manageColId) return;
    if (!confirm("Remove this picture from the folder and delete its product?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${manageColId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove_image_urls: [imageUrl] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remove failed");
      toast("Picture removed", "info");
      fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    if (!confirm(`Delete product "${productName}" and its image?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast(`Deleted "${productName}"`, "info");
      fetchData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncFolderProducts() {
    if (!manageColId) {
      toast("Select a collection folder first", "info");
      return;
    }
    setLoading(true);
    try {
      console.log("[handleSyncFolderProducts] Starting sync for collection:", manageColId);
      console.log("[handleSyncFolderProducts] Bulk price:", manageBulkPrice);
      console.log("[handleSyncFolderProducts] Default price:", colDefaultPrice);

      const parsedPrice = parseMagicalPrice(manageBulkPrice || colDefaultPrice);
      if (!parsedPrice.valid) {
        throw new Error(parsedPrice.error);
      }
      console.log("[handleSyncFolderProducts] Parsed price:", parsedPrice.storage);

      const res = await fetch(`/api/admin/collections/${manageColId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sync_only: true,
          default_price: parsedPrice.storage,
        }),
      });

      console.log("[handleSyncFolderProducts] Response status:", res.status);
      console.log("[handleSyncFolderProducts] Response ok:", res.ok);

      const data = await res.json();
      console.log("[handleSyncFolderProducts] Response data:", data);

      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast(
        `Synced folder: ${data.images?.length ?? 0} picture(s), ${data.products_created} new product(s).`,
        "success"
      );
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      console.error("[handleSyncFolderProducts] Error:", err);
      console.error("[handleSyncFolderProducts] Error message:", message);
      console.error("[handleSyncFolderProducts] Error stack:", err instanceof Error ? err.stack : "No stack");
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  const managedCollection = collections.find((c) => c.id === manageColId);
  const managedImages =
    managedCollection?.images && Array.isArray(managedCollection.images)
      ? managedCollection.images
      : [];
  const managedProductCount = products.filter(
    (p) => p.collection_id === manageColId
  ).length;

  // Submit Product
  async function handleProdSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prodName.trim() || !prodColId || !prodFile) {
      toast("Please fill all required product fields", "info");
      return;
    }
    setLoading(true);

    try {
      const imageUrl = await uploadImage(prodFile);

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName.trim(),
          description: prodDesc.trim(),
          image_url: imageUrl,
          price: prodPrice,
          collection_id: prodColId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create product");
      }

      toast("Product added successfully!", "success");
      setProdName("");
      setProdDesc("");
      setProdPrice("");
      setProdColId("");
      setProdFile(null);
      setProdPreview("");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Failed to create product", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="space-y-8 py-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold text-violet-400 border border-violet-500/20 bg-violet-950/10 tracking-widest uppercase">
            Control Center
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-3">
            Admin Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure catalog sections, upload items, and monitor customer order tickets.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          Sign out Admin
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-zinc-900 p-0.5 max-w-2xl bg-zinc-950/60 rounded-xl border border-zinc-900">
        {(["collections", "products", "tickets", "inbox"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {fetchLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-sm">Fetching catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tab Content Left Pane (Form/Details) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* COLLECTIONS TAB CONTENT */}
            {activeTab === "collections" && (
              <div className="space-y-6">
                {/* Form to Create Collection */}
                <form onSubmit={handleColSubmit} className="glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2">
                    Upload collection folder
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Upload a folder of pictures (or leave empty). Each image becomes a
                    product named from the file.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">Name</label>
                      <input
                        type="text"
                        value={colName}
                        onChange={(e) => setColName(e.target.value)}
                        placeholder="e.g. Autumn Wear"
                        required
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">
                        Default price per picture
                      </label>
                      <input
                        type="text"
                        value={colDefaultPrice}
                        onChange={(e) => setColDefaultPrice(e.target.value)}
                        placeholder="8g, 5s, 20k, or 25"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50"
                      />
                      <p className="text-[10px] text-zinc-600">{MAGICAL_PRICE_HINT}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">
                        Cover image (optional)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (!file) {
                            setColFile(null);
                            setColPreview("");
                            return;
                          }
                          if (!isImageFile(file)) {
                            toast(`"${file.name}" is not a supported image`, "error");
                            e.target.value = "";
                            return;
                          }
                          setColFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setColPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                        className="text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">Description</label>
                    <textarea
                      value={colDesc}
                      onChange={(e) => setColDesc(e.target.value)}
                      placeholder="Brief details about the collection catalog..."
                      rows={3}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">
                      Folder pictures (optional — leave empty for empty folder)
                    </label>
                    <input
                      type="file"
                      multiple
                      // No accept= here — accept + folder picker breaks PNG on Windows/Edge
                      // @ts-expect-error webkitdirectory for folder pick
                      webkitdirectory=""
                      directory=""
                      onChange={(e) => {
                        pickFolderImages(e.target.files, (files) => {
                          setColGalleryFiles(files);
                          loadFilePreviews(files, setColGalleryPreviews);
                        });
                        e.target.value = "";
                      }}
                      className="text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                    />
                    <p className="text-[10px] text-zinc-600">
                      JPG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, and more. Names
                      like <code className="text-zinc-400">blue-jacket.jpg</code> become
                      product titles.
                    </p>
                  </div>

                  {colGalleryPreviews.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Gallery Previews ({colGalleryPreviews.length} selected)</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {colGalleryPreviews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-850 group">
                            <AdminImage
                              src={preview}
                              alt={colGalleryFiles[idx]?.name || `Gallery ${idx}`}
                              fallbackLabel={colGalleryFiles[idx]?.name}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-zinc-300 truncate px-1 py-0.5">
                              {colGalleryFiles[idx]?.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = [...colGalleryFiles];
                                newFiles.splice(idx, 1);
                                setColGalleryFiles(newFiles);
                                const newPreviews = [...colGalleryPreviews];
                                newPreviews.splice(idx, 1);
                                setColGalleryPreviews(newPreviews);
                              }}
                              className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-rose-400 transition-opacity"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {colPreview && (
                    <div className="relative rounded-xl overflow-hidden max-h-36 border border-zinc-850">
                      <AdminImage
                        src={colPreview}
                        alt="Collection cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {colUploadProgress && (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 text-xs text-violet-300 backdrop-blur-sm animate-pulse flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                      <span>{colUploadProgress}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-violet-500/10 active:scale-98 disabled:opacity-50"
                  >
                    {loading ? (colUploadProgress ? "Uploading..." : "Processing...") : "Upload folder"}
                  </button>
                </form>

                {/* Manage existing folder: price + add files */}
                <div className="glass-card rounded-2xl p-6 space-y-4 border border-violet-500/10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 border-b border-zinc-850 pb-2">
                    Manage folder contents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">
                        Choose collection
                      </label>
                      <select
                        value={manageColId}
                        onChange={(e) => setManageColId(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100"
                      >
                        <option value="">Select folder…</option>
                        {collections.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">
                        Price for all pictures
                      </label>
                      <input
                        type="text"
                        value={manageBulkPrice}
                        onChange={(e) => setManageBulkPrice(e.target.value)}
                        placeholder={colDefaultPrice}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  {manageColId && (
                    <p className="text-xs text-zinc-500">
                      Inside folder: <strong className="text-zinc-300">{managedImages.length}</strong>{" "}
                      picture(s) · <strong className="text-zinc-300">{managedProductCount}</strong>{" "}
                      product(s) in database
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading || !manageColId}
                      onClick={handleApplyPriceToAll}
                      className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Apply this price to all pictures in folder
                    </button>
                    <button
                      type="button"
                      disabled={loading || !manageColId}
                      onClick={handleSyncFolderProducts}
                      className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-zinc-200 disabled:opacity-50"
                    >
                      Re-read folder → create missing products
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">
                      Add more files to this folder
                    </label>
                    <input
                      type="file"
                      multiple
                      // @ts-expect-error folder picker
                      webkitdirectory=""
                      directory=""
                      onChange={(e) => {
                        pickFolderImages(e.target.files, (files) => {
                          setManageFolderFiles(files);
                          loadFilePreviews(files, setManageFolderPreviews);
                        });
                        e.target.value = "";
                      }}
                      className="text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
                    />
                  </div>

                  {manageFolderPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {manageFolderPreviews.map((p, i) => (
                        <AdminImage
                          key={i}
                          src={p}
                          alt={manageFolderFiles[i]?.name || `New file ${i + 1}`}
                          fallbackLabel={manageFolderFiles[i]?.name}
                          className="aspect-square rounded-lg object-cover border border-zinc-800 w-full h-full"
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={loading || !manageColId || manageFolderFiles.length === 0}
                    onClick={handleAddFilesToFolder}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-200 disabled:opacity-50"
                  >
                    Upload files into selected folder
                  </button>

                  {manageColId && managedImages.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-900">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">
                        Pictures in folder — tap × to remove
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {managedImages.map((url) => (
                          <div
                            key={url}
                            className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 group"
                          >
                            <AdminImage
                              src={url}
                              alt="Folder item"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleRemoveFolderImage(url)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 border border-rose-500/50 text-rose-300 text-xs font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              aria-label="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Collections List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Existing Collections</h4>
                  <p className="text-[10px] text-zinc-600 leading-relaxed rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 align-middle mr-1" />
                    Green — normal prices.
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 align-middle mx-1 ml-2" />
                    Yellow — leaving in a few days.
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 align-middle mx-1 ml-2" />
                    Red — collection left; extra fees may apply.
                  </p>
                  {collections.length === 0 ? (
                    <p className="text-xs text-zinc-600">No collections configured yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {collections.map((col) => (
                        <div
                          key={col.id}
                          className="flex gap-3 p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 items-center"
                        >
                          <div className="w-14 h-14 bg-zinc-950 rounded-lg overflow-hidden shrink-0 border border-zinc-900">
                            {col.image_url && (
                              <AdminImage
                                src={col.image_url}
                                alt={col.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-white truncate">{col.name}</h5>
                            {col.published === false && (
                              <span className="inline-block mt-1 text-[9px] font-bold uppercase text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                Draft
                              </span>
                            )}
                            <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                              {col.description || "No description"}
                            </p>
                            {col.images && Array.isArray(col.images) && col.images.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-zinc-900/60 text-violet-400 px-1.5 py-0.5 rounded border border-zinc-800 font-medium mt-1.5">
                                {col.images.length}{" "}
                                {col.images.length === 1 ? "photo" : "photos"}
                              </span>
                            )}
                            {col.published !== false && (
                              <div className="mt-2">
                                <CollectionAvailabilityPicker
                                  value={col.availability_status}
                                  onChange={(status) =>
                                    handleSetAvailability(col.id, status)
                                  }
                                  disabled={loading}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {col.published === false && (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handlePublishCollection(col.id, col.name)}
                                className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => setManageColId(col.id)}
                              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-900"
                            >
                              Manage
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleDeleteCollection(col.id, col.name)}
                              className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-2.5 py-1.5 text-[10px] font-bold text-rose-300"
                            >
                              Delete
                            </button>
                            <CollectionDownloadButtons
                              layout="stack"
                              name={col.name}
                              description={col.description}
                              images={col.images}
                              image_url={col.image_url}
                              created_at={col.created_at}
                              disabled={loading}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PRODUCTS TAB CONTENT */}
            {activeTab === "products" && (
              <div className="space-y-6">
                {/* Form to Create Product */}
                <form onSubmit={handleProdSubmit} className="glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2">
                    Add New Product
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">Product Name *</label>
                      <input
                        type="text"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="e.g. Premium Leather Jacket"
                        required
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">Price *</label>
                      <input
                        type="text"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="8g, 5s, 20k"
                        required
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">Collection *</label>
                      <select
                        value={prodColId}
                        onChange={(e) => setProdColId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-400 outline-none focus:border-violet-500/50"
                      >
                        <option value="">Select Collection</option>
                        {collections.map((col) => (
                          <option key={col.id} value={col.id} className="text-zinc-100 bg-zinc-950">
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase">Product Image *</label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (!file) {
                            setProdFile(null);
                            setProdPreview("");
                            return;
                          }
                          if (!isImageFile(file)) {
                            toast(`"${file.name}" is not a supported image`, "error");
                            e.target.value = "";
                            return;
                          }
                          setProdFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setProdPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                        required
                        className="text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">Description</label>
                    <textarea
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      placeholder="Brief details about product specifications..."
                      rows={3}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500/50 resize-none"
                    />
                  </div>

                  {prodPreview && (
                    <div className="relative rounded-xl overflow-hidden max-h-36">
                      <AdminImage
                        src={prodPreview}
                        alt="Product preview"
                        className="w-full h-full object-cover max-h-36"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-violet-500/10 active:scale-98 disabled:opacity-50"
                  >
                    {loading ? "Adding Product..." : "Create Product"}
                  </button>
                </form>

                {/* Products List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Existing Products</h4>
                  {products.length === 0 ? (
                    <p className="text-xs text-zinc-600">No products uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((prod) => {
                        const parentColName = collections.find((c) => c.id === prod.collection_id)?.name || "Store";
                        return (
                          <div
                            key={prod.id}
                            className="flex gap-3 p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 items-center"
                          >
                            <div className="w-14 h-14 bg-zinc-950 rounded-lg overflow-hidden shrink-0 border border-zinc-900">
                              {prod.image_url && (
                                <AdminImage
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-white truncate">{prod.name}</h5>
                              <div className="flex gap-2 items-center mt-0.5 flex-wrap">
                                <span className="text-[10px] text-zinc-500">
                                  <PriceDisplay price={prod.price} />
                                </span>
                                <span className="text-[9px] bg-zinc-900 text-violet-400 px-1.5 py-0.5 rounded border border-zinc-800">
                                  {parentColName}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-950/20 px-2.5 py-1.5 text-[10px] font-bold text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TICKETS TAB CONTENT */}
            {activeTab === "tickets" && (
              <AdminTicketsPanel onCountChange={setTicketCount} />
            )}

            {/* INBOX TAB CONTENT */}
            {activeTab === "inbox" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                    User Messaging
                  </h3>
                  <button
                    onClick={() => setShowUserSidebar(!showUserSidebar)}
                    className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                  >
                    {showUserSidebar ? "Hide Users" : "Show Users"}
                  </button>
                </div>
                <div className="flex gap-4">
                  {showUserSidebar && (
                    <div className="w-80">
                      <UserListSidebar
                        onSelectUser={setSelectedUser}
                        selectedUserId={selectedUser?.id}
                        isOpen={showUserSidebar}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <AdminInboxPanel selectedUser={selectedUser} />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Pane (Summary Dashboard) */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2">
                System Overview
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Collections</span>
                  <span className="text-lg font-black text-white">{collections.length}</span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Products</span>
                  <span className="text-lg font-black text-white">{products.length}</span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Tickets</span>
                  <span className="text-lg font-black text-white">{ticketCount}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/collections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center rounded-xl bg-zinc-800/80 hover:bg-zinc-800 py-3 text-xs font-bold text-zinc-300 border border-zinc-800 transition-colors inline-block"
                >
                  View user Collections tab &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { FormEvent, useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/types/profile";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type ProfileFormProps = {
  profile: Profile;
  userId: string;
};

export default function ProfileForm({ profile, userId }: ProfileFormProps) {
  const [username, setUsername] = useState(profile.username ?? "");
  const [password, setPassword] = useState(profile.password ?? "");
  const [pictureLink, setPictureLink] = useState(profile.avatar_url ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(profile.avatar_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    setPictureLink("");
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handlePictureLinkChange(value: string) {
    setPictureLink(value);
    setPhotoFile(null);
    if (value.trim()) {
      setPhotoPreview(value.trim());
    } else {
      setPhotoPreview(profile.avatar_url ?? "");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    const link = pictureLink.trim();
    if (!link && !photoFile && !profile.avatar_url) {
      setError("Add a picture link or upload an image");
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = link || profile.avatar_url || null;

      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, photoFile, { upsert: false });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(filePath);

        avatarUrl = data.publicUrl;
      }

      if (!avatarUrl) {
        throw new Error("Picture link or upload is required");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          password: password,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log("[ProfileForm] Saved:", {
        username: username.trim(),
        avatar_url: avatarUrl,
      });

      toast("Profile updated successfully!", "success");
      router.push("/collections");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      console.error("[ProfileForm] error:", err);
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder-zinc-700 transition focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder-zinc-700 transition focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pictureLink"
          className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
        >
          Picture link (URL)
        </label>
        <input
          id="pictureLink"
          type="url"
          value={pictureLink}
          onChange={(e) => handlePictureLinkChange(e.target.value)}
          placeholder="https://example.com/your-photo.jpg"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder-zinc-700 transition focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20"
        />
        <p className="text-xs text-zinc-500">
          Paste a direct image URL, or upload a file below.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Or upload image
        </span>
        <label className="cursor-pointer">
          <div className="w-full rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center transition hover:border-zinc-700">
            <p className="text-sm font-medium text-zinc-400">Click to upload</p>
            <p className="text-xs text-zinc-600 mt-1">PNG, JPG, GIF up to 5MB</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>
      </div>

      {photoPreview && (
        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-2">
          <img
            src={photoPreview}
            alt="Preview"
            className="w-full h-44 object-cover rounded-lg"
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-violet-500/10"
      >
        {loading ? "Saving Profile..." : "Complete Profile"}
      </button>
    </form>
  );
}

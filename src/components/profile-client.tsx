"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Building2, Key, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { updateProfileSettings } from "@/app/actions/profile";

interface ProfileClientProps {
  profile: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    organization: {
      name: string;
    };
  };
}

export default function ProfileClient({ profile }: ProfileClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState(profile.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      setErrorMsg("");
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Display name is required.");
      setIsSubmitting(false);
      return;
    }

    if (password) {
      if (password.length < 6) {
        setErrorMsg("New password must be at least 6 characters long.");
        setIsSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        setIsSubmitting(false);
        return;
      }
    }

    const res = await updateProfileSettings({
      name: name.trim(),
      avatarUrl: avatarPreview,
      password: password || undefined,
    });

    if (res.success) {
      setSuccessMsg("Profile settings updated successfully!");
      setPassword("");
      setConfirmPassword("");
      router.refresh();
    } else {
      setErrorMsg(res.error || "Failed to update profile settings.");
    }
    setIsSubmitting(false);
  };

  // Get initials for Avatar fallback
  const initials = (name || profile.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Profile Settings</h2>
        <p className="text-slate-400">Update your account information, profile picture, and security details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 font-medium animate-fadeIn">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 font-medium animate-fadeIn">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left panel - Avatar Management */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 w-full text-left border-b border-white/5 pb-2">Profile Photo</h3>
            
            <div className="relative group cursor-pointer" onClick={handleTriggerUpload}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile Avatar"
                  className="h-28 w-28 rounded-full object-cover border border-white/10 shadow-lg"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-primary/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-2xl font-bold text-primary shadow-lg">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 bg-slate-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={handleTriggerUpload}
                className="w-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2 px-3 transition cursor-pointer"
              >
                Upload Photo
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="w-full text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl py-2 px-3 transition cursor-pointer"
                >
                  Remove Photo
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Supports PNG, JPG, or GIF. Max size 2MB.</p>
          </div>

          {/* Right panel - Form fields */}
          <div className="md:col-span-2 space-y-6">
            {/* Account Info */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 border-b border-white/5 pb-2">Account Info</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Mohomed Naashik"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/20 py-2.5 pl-10 pr-4 text-sm text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">User Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      disabled
                      value={profile.role}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/20 py-2.5 pl-10 pr-4 text-sm text-slate-500 outline-none cursor-not-allowed uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Organization / Business</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      disabled
                      value={profile.organization.name}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/20 py-2.5 pl-10 pr-4 text-sm text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 border-b border-white/5 pb-2">Change Password</h3>
              <p className="text-xs text-slate-500">Leave blank if you do not want to change your password.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">New Password</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Confirm New Password</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary hover:bg-primary/95 py-3 px-6 text-sm font-semibold text-slate-950 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 font-sans shadow-lg shadow-primary/10"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AddressManager from "../components/AddressManager";
import PageTransition from "../components/PageTransition";

const ProfilePage = () => {
  const { user, loading: authLoading, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  const handleProfileSave = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        ...(password ? { password } : {})
      });
      setPassword("");
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Unable to update profile right now");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading && !user) {
    return (
      <PageTransition className="section-shell py-6">
        <div className="card-surface p-6">
          <h1 className="text-3xl font-extrabold text-slate-900">Profile</h1>
          <p className="mt-3 text-sm text-slate-500">Loading your profile...</p>
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition className="section-shell py-6">
        <div className="card-surface p-6">
          <h1 className="text-3xl font-extrabold text-slate-900">Profile</h1>
          <p className="mt-3 text-sm text-rose-600">Unable to load profile details. Please sign in again.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="section-shell grid gap-6 py-6 lg:grid-cols-2">
      <div className="card-surface p-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Profile</h1>
        <form className="mt-6 space-y-4" onSubmit={handleProfileSave}>
          <input value={user.email || ""} disabled className="input-field cursor-not-allowed bg-slate-100" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-field"
            placeholder="Full name"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="input-field"
            placeholder="New password (optional)"
          />
          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          <button type="submit" className="gradient-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>

      <div className="card-surface p-6">
        <AddressManager
          title="Saved addresses"
          description="Manage delivery addresses used for checkout and order confirmation."
        />
      </div>
    </PageTransition>
  );
};

export default ProfilePage;

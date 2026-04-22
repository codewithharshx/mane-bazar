import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../services/authApi";
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from "../services/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredAuth().user || null);
  const [accessToken, setAccessToken] = useState(getStoredAuth().accessToken || "");
  const [loading, setLoading] = useState(false);
  // Prevents the bootstrap effect from running twice in React Strict Mode
  const bootstrapped = useRef(false);

  // ── Bootstrap auth on mount (or when accessToken changes) ────────────────
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const bootstrapAuth = async () => {
      const { accessToken: storedToken } = getStoredAuth();

      if (storedToken) {
        // We have a token — fetch full profile to ensure it's valid
        try {
          const { data } = await authApi.me();
          setUser(data);
          saveStoredAuth({ user: data, accessToken: storedToken });
        } catch {
          // Token expired or invalid — try refresh via httpOnly cookie
          try {
            const { data } = await authApi.refreshToken();
            setUser(data.user);
            setAccessToken(data.accessToken);
            saveStoredAuth({ user: data.user, accessToken: data.accessToken });
          } catch {
            clearStoredAuth();
            setUser(null);
            setAccessToken("");
          }
        }
        return;
      }

      // No stored token — try cookie-based silent refresh
      try {
        const { data } = await authApi.refreshToken();
        setUser(data.user);
        setAccessToken(data.accessToken);
        saveStoredAuth({ user: data.user, accessToken: data.accessToken });
      } catch {
        // Not logged in — expected, do nothing
      }
    };

    bootstrapAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist auth to storage whenever it changes ───────────────────────────
  useEffect(() => {
    if (user || accessToken) {
      saveStoredAuth({ user, accessToken });
    }
  }, [user, accessToken]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const handleAuthSuccess = (data, message) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    saveStoredAuth({ user: data.user, accessToken: data.accessToken });
    if (message) toast.success(message);
    return data;
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await authApi.register(payload);
      return handleAuthSuccess(data, data.message || "Account created successfully");
    } finally {
      setLoading(false);
    }
  };

  const login = async (payload) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(payload);
      return handleAuthSuccess(data, "Logged in successfully");
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const { data } = await authApi.requestPasswordReset(email);
      toast.success(data.message || "Password reset link sent to your email");
      return data;
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to request password reset";
      toast.error(msg);
      throw error;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const { data } = await authApi.resetPassword(token, password);
      toast.success(data.message || "Password reset successful");
      return data;
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password";
      toast.error(msg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API failures — clear locally regardless
    } finally {
      setUser(null);
      setAccessToken("");
      clearStoredAuth();
      toast.success("Logged out successfully");
    }
  };

  const refreshProfile = async () => {
    const { data } = await authApi.me();
    setUser(data);
    saveStoredAuth({ user: data, accessToken });
    return data;
  };

  const updateProfile = async (payload) => {
    const { data } = await authApi.updateProfile(payload);
    setUser(data.user);
    toast.success(data.message);
    return data.user;
  };

  const addAddress = async (payload) => {
    const { data } = await authApi.addAddress(payload);
    setUser((current) => (current ? { ...current, addresses: data.addresses } : current));
    toast.success(data.message);
    return data.address;
  };

  const updateAddress = async (addressId, payload) => {
    const { data } = await authApi.updateAddress(addressId, payload);
    setUser((current) => (current ? { ...current, addresses: data.addresses } : current));
    toast.success(data.message);
    return data.address;
  };

  const deleteAddress = async (addressId) => {
    const { data } = await authApi.deleteAddress(addressId);
    setUser((current) => (current ? { ...current, addresses: data.addresses } : current));
    toast.success(data.message);
    return data.addresses;
  };

  const setDefaultAddress = async (addressId) => {
    const address = user?.addresses?.find((item) => item._id === addressId);
    if (!address) {
      return null;
    }

    return updateAddress(addressId, { ...address, isDefault: true });
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isAdmin: user?.role === "admin",
      loading,
      register,
      login,
      requestPasswordReset,
      resetPassword,
      logout,
      refreshProfile,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress
    }),
    [user, accessToken, loading] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

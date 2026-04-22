import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { orderApi } from "../services/orderApi";
import { paymentApi } from "../services/paymentApi";
import { DELIVERY_SLOTS } from "../utils/constants";
import { formatCurrency } from "../utils/formatters";
import { createIdempotencyKey } from "../utils/idempotency";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import PageTransition from "../components/PageTransition";
import AddressListSelection from "../components/AddressListSelection";
import CheckoutAddressConfirmationModal from "../components/CheckoutAddressConfirmationModal";
import { formatAddressSummary, getPrimaryAddress, normalizeAddress } from "../utils/address";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, addAddress } = useAuth();
  const { cartItems, subtotal, coupon, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalInitialStep, setAddressModalInitialStep] = useState("confirm");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const addresses = user?.addresses || [];

  const pricing = useMemo(() => {
    const discount = coupon?.discount || 0;
    const deliveryCharge = subtotal >= 499 ? 0 : 40;
    const tax = (subtotal - discount) * 0.05;
    return {
      subtotal,
      discount,
      deliveryCharge,
      tax,
      total: subtotal - discount + deliveryCharge + tax
    };
  }, [subtotal, coupon]);

  useEffect(() => {
    const primaryAddress = getPrimaryAddress(addresses);
    if (primaryAddress && (!selectedAddressId || !addresses.some((item) => item._id === selectedAddressId))) {
      setSelectedAddressId(primaryAddress._id);
    }
  }, [addresses, selectedAddressId]);
  const selectedAddress = addresses.find((item) => item._id === selectedAddressId) || getPrimaryAddress(addresses);

  const openAddressModal = (initialStep = addresses.length ? "confirm" : "form") => {
    setAddressModalInitialStep(initialStep);
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => setAddressModalOpen(false);
  const buildPayload = (address) => {
    const normalizedAddress = normalizeAddress(address || selectedAddress || {});

    return {
      items: cartItems.map((item) => ({ productId: item._id, qty: item.qty })),
      deliveryAddress: {
        ...normalizedAddress,
        fullName: normalizedAddress.fullName || user?.name || "",
        phoneNumber: normalizedAddress.phoneNumber || ""
      },
      deliverySlot: {
        date: deliveryDate,
        timeSlot: deliverySlot
      },
      couponCode: coupon?.code || ""
    };
  };

  const handleSuccess = (orderId) => {
    clearCart();
    toast.success("Order placed successfully");
    navigate(`/orders/${orderId}`);
  };

  const handleCOD = async (attemptKey, address) => {
    const { data } = await orderApi.createCod(
      buildPayload(address),
      {
        headers: {
          "x-idempotency-key": `${attemptKey}:cod`
        }
      }
    );
    handleSuccess(data.order.orderId);
  };

  const handleRazorpay = async (attemptKey, address) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Unable to load Razorpay checkout");
    }

    const payload = buildPayload(address);
    const { data } = await paymentApi.createOrder(
      payload,
      {
        headers: {
          "x-idempotency-key": `${attemptKey}:create-order`
        }
      }
    );

    await new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Mane Bazar",
        description: "Grocery order payment",
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verifyResponse = await paymentApi.verify(
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              },
              {
                headers: { "x-idempotency-key": `${attemptKey}:verify` }
              }
            );
            handleSuccess(verifyResponse.data.order.orderId);
            resolve();
          } catch (error) {
            try {
              await paymentApi.paymentFailed({
                razorpayOrderId: data.order.id,
                reason: "Verification request failed"
              });
            } catch {
              // best-effort cleanup
            }
            reject(error);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: payload.deliveryAddress.phoneNumber
        },
        theme: {
          color: "#16a34a"
        },
        modal: {
          ondismiss: () => {
            paymentApi.paymentFailed({
              razorpayOrderId: data.order.id,
              reason: "Payment cancelled by user"
            }).catch(() => {});
            reject(new Error("Payment cancelled"));
          }
        }
      });

      razorpay.open();
    });
  };

  const executeCheckout = async (address) => {
    if (!cartItems.length) {
      toast.error("Your cart is empty");
      return;
    }

    const deliveryAddress = normalizeAddress(address || selectedAddress || {});
    if (!deliveryAddress.fullName || !deliveryAddress.addressLine1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode || !deliveryAddress.phoneNumber) {
      toast.error("Please provide a complete delivery address");
      return;
    }

    setPlacingOrder(true);
    const attemptKey = createIdempotencyKey("checkout");
    try {
      if (paymentMethod === "cod") {
        await handleCOD(attemptKey, deliveryAddress);
      } else {
        await handleRazorpay(attemptKey, deliveryAddress);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Checkout failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCheckoutContinue = async (address) => {
    setAddressModalOpen(false);
    await executeCheckout(address);
  };

  const handleAddAddress = async (payload) => {
    const savedAddress = await addAddress(payload);
    if (savedAddress?._id) {
      setSelectedAddressId(savedAddress._id);
    }
    return savedAddress;
  };

  const handlePlaceOrderClick = () => {
    if (!cartItems.length) {
      toast.error("Your cart is empty");
      return;
    }

    openAddressModal(addresses.length ? "confirm" : "form");
  };

  return (
    <PageTransition className="section-shell grid gap-8 py-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-700">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Confirm address, delivery slot, and payment method
          </h1>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Delivery address</h2>
            <button
              type="button"
              onClick={() => openAddressModal("form")}
              className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700"
            >
              Add new address
            </button>
          </div>

          {addresses.length ? (
            <div className="mt-4 space-y-4">
              <AddressListSelection
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelect={setSelectedAddressId}
                showActions={false}
              />
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Selected for checkout
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {selectedAddress ? formatAddressSummary(selectedAddress) : "No address selected"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Add your delivery address to continue checkout.
            </div>
          )}
        </div>

        <div className="card-surface p-6">
          <h2 className="text-xl font-bold text-slate-900">Delivery slot</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="input-field">
              <option value={new Date().toISOString().slice(0, 10)}>Today</option>
              <option value={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}>Tomorrow</option>
            </select>
            <select value={deliverySlot} onChange={(event) => setDeliverySlot(event.target.value)} className="input-field">
              {DELIVERY_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-xl font-bold text-slate-900">Payment method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["razorpay", "cod"].map((method) => (
              <label
                key={method}
                className={`rounded-3xl border p-4 ${paymentMethod === method ? "border-green-500 bg-green-50" : "border-slate-200"}`}
              >
                <input
                  type="radio"
                  className="mr-3"
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                <span className="font-semibold text-slate-900">
                  {method === "razorpay" ? "Razorpay Online Payment" : "Cash on Delivery"}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <aside className="card-surface h-fit p-6">
        <h2 className="text-2xl font-bold text-slate-900">Order summary</h2>
        <div className="mt-5 space-y-3">
          {cartItems.map((item) => (
            <div key={item._id} className="flex items-center justify-between text-sm text-slate-600">
              <span>
                {item.name} x {item.qty}
              </span>
              <span>{formatCurrency(item.price * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(pricing.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Coupon</span>
            <span>- {formatCurrency(pricing.discount)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>GST</span>
            <span>{formatCurrency(pricing.tax)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Delivery</span>
            <span>{pricing.deliveryCharge ? formatCurrency(pricing.deliveryCharge) : "Free"}</span>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-700">Total payable</span>
          <span className="text-3xl font-extrabold text-slate-900">{formatCurrency(pricing.total)}</span>
        </div>
        <button
          type="button"
          disabled={placingOrder}
          onClick={handlePlaceOrderClick}
          className="gradient-button mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {placingOrder ? "Processing..." : paymentMethod === "cod" ? "Place COD order" : "Pay with Razorpay"}
        </button>
      </aside>

      <CheckoutAddressConfirmationModal
        isOpen={addressModalOpen}
        initialStep={addressModalInitialStep}
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={setSelectedAddressId}
        onContinue={handleCheckoutContinue}
        onAddAddress={handleAddAddress}
        onClose={closeAddressModal}
      />
    </PageTransition>
  );
};

export default CheckoutPage;

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AddressForm from "./AddressForm";
import AddressListSelection from "./AddressListSelection";
import { emptyAddress, getPrimaryAddress, normalizeAddress, formatAddressSummary } from "../utils/address";

const CheckoutAddressConfirmationModal = ({
  isOpen,
  initialStep = "confirm",
  addresses = [],
  selectedAddressId,
  onSelectAddress,
  onContinue,
  onAddAddress,
  onClose
}) => {
  const [step, setStep] = useState("confirm");
  const [draft, setDraft] = useState(emptyAddress);

  const selectedAddress = addresses.find((address) => address._id === selectedAddressId) || getPrimaryAddress(addresses);

  useEffect(() => {
    if (!isOpen) return;

    const primaryAddress = getPrimaryAddress(addresses);
    const nextStep = initialStep === "form" || !addresses.length ? "form" : initialStep;
    setStep(nextStep);
    setDraft(normalizeAddress(primaryAddress || emptyAddress));
  }, [initialStep, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleContinue = () => {
    if (selectedAddress) {
      onContinue(selectedAddress);
    }
  };

  const handleSaveNewAddress = async (event) => {
    event.preventDefault();
    const savedAddress = await onAddAddress(draft);
    if (savedAddress?._id) {
      onSelectAddress(savedAddress._id);
    }
    setStep("confirm");
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22 }}
          onClick={(event) => event.stopPropagation()}
          className="glass-panel w-full max-w-3xl rounded-[32px] p-6 shadow-2xl"
        >
          {step === "confirm" ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-700">
                  Delivery confirmation
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Deliver to this address?</h3>
              </div>

              {selectedAddress ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedAddress.label || "Home"}</p>
                      <p className="text-sm text-slate-500">{selectedAddress.isDefault ? "Default address" : "Selected address"}</p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {formatAddressSummary(selectedAddress)}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No saved address selected yet.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleContinue} className="gradient-button" disabled={!selectedAddress}>
                  Yes, continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  className="rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                >
                  Change address
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="rounded-full border border-emerald-200 px-5 py-3 font-semibold text-emerald-700"
                >
                  Add new address
                </button>
              </div>
            </div>
          ) : null}

          {step === "choose" ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-700">
                  Choose address
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Select a delivery address</h3>
              </div>

              <AddressListSelection
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelect={onSelectAddress}
                showActions={false}
                emptyMessage="Add an address to continue checkout."
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="gradient-button"
                  disabled={!selectedAddress}
                >
                  Use this address
                </button>
                <button
                  type="button"
                  onClick={() => (addresses.length ? setStep("confirm") : onClose())}
                  className="rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="rounded-full border border-emerald-200 px-5 py-3 font-semibold text-emerald-700"
                >
                  Add new address
                </button>
              </div>
            </div>
          ) : null}

          {step === "form" ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-700">
                  Add address
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Add a new delivery address</h3>
              </div>

              <AddressForm
                value={draft}
                onChange={setDraft}
                onSubmit={handleSaveNewAddress}
                onCancel={() => (addresses.length ? setStep("confirm") : onClose())}
                submitLabel="Save address"
                showDefaultToggle
              />
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutAddressConfirmationModal;
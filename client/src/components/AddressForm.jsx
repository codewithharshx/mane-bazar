const AddressForm = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Save address",
  saving = false,
  title,
  description,
  showDefaultToggle = true
}) => {
  const updateField = (field) => (event) => {
    const nextValue = field === "isDefault" ? event.target.checked : event.target.value;
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {title ? <h3 className="text-xl font-bold text-slate-900">{title}</h3> : null}
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={value.label}
          onChange={updateField("label")}
          className="input-field"
          placeholder="Label"
          autoComplete="off"
        />
        <input
          value={value.fullName}
          onChange={updateField("fullName")}
          className="input-field"
          placeholder="Full name"
          autoComplete="name"
        />
        <input
          value={value.phoneNumber}
          onChange={updateField("phoneNumber")}
          className="input-field"
          placeholder="Phone number"
          autoComplete="tel"
        />
        <input
          value={value.addressLine1}
          onChange={updateField("addressLine1")}
          className="input-field"
          placeholder="Address line 1"
          autoComplete="address-line1"
        />
        <input
          value={value.addressLine2}
          onChange={updateField("addressLine2")}
          className="input-field sm:col-span-2"
          placeholder="Address line 2 (optional)"
          autoComplete="address-line2"
        />
        <input
          value={value.landmark}
          onChange={updateField("landmark")}
          className="input-field sm:col-span-2"
          placeholder="Landmark (optional)"
          autoComplete="off"
        />
        <input
          value={value.city}
          onChange={updateField("city")}
          className="input-field"
          placeholder="City"
          autoComplete="address-level2"
        />
        <input
          value={value.state}
          onChange={updateField("state")}
          className="input-field"
          placeholder="State"
          autoComplete="address-level1"
        />
        <input
          value={value.pincode}
          onChange={updateField("pincode")}
          className="input-field"
          placeholder="Pincode"
          autoComplete="postal-code"
        />
      </div>

      {showDefaultToggle ? (
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(value.isDefault)}
            onChange={updateField("isDefault")}
            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          Set as default address
        </label>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="gradient-button disabled:opacity-60">
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
};

export default AddressForm;
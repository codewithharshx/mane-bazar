import { formatAddressSummary } from "../utils/address";

const AddressListSelection = ({
  addresses = [],
  selectedAddressId,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  emptyMessage = "No saved addresses yet.",
  showActions = true
}) => {
  if (!addresses.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <label
          key={address._id}
          className={`block rounded-3xl border p-4 transition ${selectedAddressId === address._id ? "border-green-500 bg-green-50" : "border-slate-200 bg-white"}`}
        >
          <div className="flex items-start gap-3">
            {onSelect ? (
              <input
                type="radio"
                name="address"
                className="mt-1"
                checked={selectedAddressId === address._id}
                onChange={() => onSelect(address._id)}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{address.label || "Home"}</span>
                {address.isDefault ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {formatAddressSummary(address)}
              </p>
            </div>
          </div>

          {showActions && (onEdit || onDelete || onSetDefault) ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(address)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Edit
                </button>
              ) : null}
              {onSetDefault && !address.isDefault ? (
                <button
                  type="button"
                  onClick={() => onSetDefault(address)}
                  className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700"
                >
                  Make default
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(address)}
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </label>
      ))}
    </div>
  );
};

export default AddressListSelection;
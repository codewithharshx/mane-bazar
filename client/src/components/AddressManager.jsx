import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import AddressForm from "./AddressForm";
import AddressListSelection from "./AddressListSelection";
import { emptyAddress, normalizeAddress } from "../utils/address";
import { useAuth } from "../context/AuthContext";

const AddressManager = ({ title = "Saved addresses", description = "Manage your delivery addresses." }) => {
  const { user, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAuth();
  const [formValue, setFormValue] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const addresses = user?.addresses || [];

  const startCreate = () => {
    setEditingAddressId("");
    setFormValue(emptyAddress);
  };

  const startEdit = (address) => {
    setEditingAddressId(address._id);
    setFormValue(normalizeAddress(address));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, formValue);
      } else {
        await addAddress(formValue);
      }
      startCreate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAddress(deleteTarget._id);
    setDeleteTarget(null);
    if (editingAddressId === deleteTarget._id) {
      startCreate();
    }
  };

  const handleSetDefault = async (address) => {
    await setDefaultAddress(address._id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <AddressListSelection
        addresses={addresses}
        onEdit={startEdit}
        onDelete={setDeleteTarget}
        onSetDefault={handleSetDefault}
        emptyMessage="Add at least one delivery address to speed up checkout."
      />

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingAddressId ? "Edit address" : "Add new address"}
            </h3>
            <p className="text-sm text-slate-500">
              {editingAddressId ? "Update the selected address details." : "Create a reusable delivery address."}
            </p>
          </div>
          {!editingAddressId ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clear form
            </button>
          ) : null}
        </div>

        <AddressForm
          value={formValue}
          onChange={setFormValue}
          onSubmit={handleSubmit}
          onCancel={editingAddressId ? startCreate : null}
          submitLabel={editingAddressId ? "Update address" : "Add address"}
          saving={saving}
        />
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete address?"
        message={deleteTarget ? `Remove ${deleteTarget.label || "this address"} from your saved list?` : ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default AddressManager;
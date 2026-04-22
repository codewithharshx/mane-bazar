import AddressManager from "../components/AddressManager";
import PageTransition from "../components/PageTransition";

const AddressesPage = () => (
  <PageTransition className="section-shell py-6">
    <AddressManager
      title="Address book"
      description="Create, edit, and set default delivery addresses for faster checkout."
    />
  </PageTransition>
);

export default AddressesPage;
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Home,
  Building2,
  Navigation,
} from "lucide-react";
import EnhancedAddressForm from "./EnhancedAddressForm";

interface AddressData {
  flatNo: string;
  street: string;
  landmark: string;
  village: string;
  city: string;
  pincode: string;
  fullAddress: string;
  coordinates?: { lat: number; lng: number };
  label: string;
  type: "home" | "work" | "other";
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SavedAddressesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: AddressData) => void;
  currentUser?: any;
}

const SavedAddressesModal: React.FC<SavedAddressesModalProps> = React.memo(
  ({ isOpen, onClose, onSelectAddress, currentUser }) => {
    const [addresses, setAddresses] = useState<AddressData[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<AddressData | null>(null);

    useEffect(() => {
      if (isOpen) loadSavedAddresses();
    }, [isOpen, currentUser]);

    const getUserId = () =>
      currentUser?._id || currentUser?.id || currentUser?.phone;

    const loadSavedAddresses = () => {
      const userId = getUserId();
      if (!userId) return;

      const saved = localStorage.getItem(`addresses_${userId}`);
      setAddresses(saved ? JSON.parse(saved) : []);
    };

    const saveAddresses = (newAddresses: AddressData[]) => {
      const userId = getUserId();
      if (!userId) return;

      localStorage.setItem(`addresses_${userId}`, JSON.stringify(newAddresses));
      setAddresses(newAddresses);
    };

    const addAddress = (address: AddressData) => {
      const isDuplicate = addresses.some((addr) => {
        return (
          (address.type !== "other" && addr.type === address.type) ||
          addr.fullAddress === address.fullAddress ||
          (addr.flatNo === address.flatNo &&
            addr.street === address.street &&
            addr.city === address.city &&
            addr.pincode === address.pincode)
        );
      });

      if (isDuplicate) {
        alert("This address already exists.");
        setShowAddForm(false);
        return;
      }

      const newAddress = {
        ...address,
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = address.type !== "other"
        ? [...addresses.filter(a => a.type !== address.type), newAddress]
        : [...addresses, newAddress];

      saveAddresses(updated);
      setShowAddForm(false);
    };

    const editAddress = (address: AddressData) => {
      if (!editingAddress?.id) return;

      const updated = addresses.map((addr) =>
        addr.id === editingAddress.id
          ? { ...address, id: editingAddress.id, updatedAt: new Date().toISOString() }
          : addr
      );

      saveAddresses(updated);
      setEditingAddress(null);
      setShowAddForm(false);
    };

    const deleteAddress = (id: string) => {
      saveAddresses(addresses.filter((addr) => addr.id !== id));
    };

    const getIcon = (type: string) =>
      type === "home" ? <Home className="h-4 w-4 text-green-600" />
      : type === "work" ? <Building2 className="h-4 w-4 text-blue-600" />
      : <MapPin className="h-4 w-4 text-gray-600" />;

    const getBadgeColor = (type: string) =>
      type === "home" ? "bg-green-100 text-green-800 border-green-200"
      : type === "work" ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Saved Addresses
              </DialogTitle>
              <DialogDescription>Manage your saved addresses</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {addresses.length === 0
                    ? "No saved addresses yet"
                    : `${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`}
                </p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>

              {addresses.map((address) => (
                <Card key={address.id} className="border hover:border-gray-300">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        {getIcon(address.type)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium truncate">
                              {address.label}
                            </h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${getBadgeColor(address.type)}`}
                            >
                              {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 break-words">
                            {address.fullAddress}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {address.createdAt && (
                              <span>
                                Added: {new Date(address.createdAt).toLocaleDateString()}
                              </span>
                            )}
                            {address.coordinates && (
                              <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                Location saved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAddress(address)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Address?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{address.label}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAddress(address.id!)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          onClick={() => {
                            onSelectAddress(address);
                            onClose();
                          }}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {addresses.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Addresses</h3>
                  <p className="text-gray-600 mb-4">Add your frequently used addresses.</p>
                  <Button onClick={() => setShowAddForm(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Address
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Address Modal */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
              <DialogDescription>Fill in the details below</DialogDescription>
            </DialogHeader>
            <EnhancedAddressForm onAddressUpdate={addAddress} showLabel={true} />
          </DialogContent>
        </Dialog>

        {/* Edit Address Modal */}
        <Dialog open={!!editingAddress} onOpenChange={() => setEditingAddress(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Address</DialogTitle>
              <DialogDescription>Update your address details</DialogDescription>
            </DialogHeader>
            {editingAddress && (
              <EnhancedAddressForm
                initialAddress={editingAddress}
                onAddressUpdate={editAddress}
                showLabel={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

SavedAddressesModal.displayName = "SavedAddressesModal";

export default SavedAddressesModal;

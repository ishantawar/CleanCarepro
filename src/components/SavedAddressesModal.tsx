import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  flatHouseNo?: string;
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

const SavedAddressesModal: React.FC<SavedAddressesModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  currentUser,
}) => {
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressData | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedAddresses();
    }
  }, [isOpen, currentUser]);

  const loadSavedAddresses = () => {
    if (!currentUser?.id && !currentUser?._id && !currentUser?.phone) return;

    const userId = currentUser._id || currentUser.id || currentUser.phone;
    const savedAddresses = localStorage.getItem(`addresses_${userId}`);

    if (savedAddresses) {
      const parsed = JSON.parse(savedAddresses);
      setAddresses(Array.isArray(parsed) ? parsed : []);
    } else {
      setAddresses([]);
    }
  };

  const saveAddresses = (newAddresses: AddressData[]) => {
    if (!currentUser?.id && !currentUser?._id && !currentUser?.phone) return;

    const userId = currentUser._id || currentUser.id || currentUser.phone;
    localStorage.setItem(`addresses_${userId}`, JSON.stringify(newAddresses));
    setAddresses(newAddresses);
  };

  const handleAddAddress = (address: AddressData) => {
    // Check for duplicate addresses by comparing full address
    const existingAddresses = [...addresses];
    const isDuplicate = existingAddresses.some(addr =>
      addr.fullAddress === address.fullAddress && addr.type === address.type
    );

    if (isDuplicate) {
      console.log("Address already exists, not adding duplicate");
      setShowAddForm(false);
      return;
    }

    const newAddress: AddressData = {
      ...address,
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Replace existing address of same type (except "other")
    if (address.type !== "other") {
      const existingIndex = existingAddresses.findIndex(addr => addr.type === address.type);
      if (existingIndex >= 0) {
        existingAddresses[existingIndex] = newAddress;
        saveAddresses(existingAddresses);
      } else {
        saveAddresses([...existingAddresses, newAddress]);
      }
    } else {
      saveAddresses([...existingAddresses, newAddress]);
    }

    setShowAddForm(false);
  };
    setShowAddForm(false);
  };

  const handleEditAddress = (address: AddressData) => {
    const updatedAddresses = addresses.map((addr) =>
      addr.id === address.id
        ? { ...address, updatedAt: new Date().toISOString() }
        : addr,
    );
    saveAddresses(updatedAddresses);
    setEditingAddress(null);
  };

  const handleDeleteAddress = (id: string) => {
    const updatedAddresses = addresses.filter((addr) => addr.id !== id);
    saveAddresses(updatedAddresses);
    setDeletingId(null);
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="h-4 w-4 text-green-600" />;
      case "work":
        return <Building2 className="h-4 w-4 text-blue-600" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAddressTypeColor = (type: string) => {
    switch (type) {
      case "home":
        return "bg-green-100 text-green-800 border-green-200";
      case "work":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAvailableTypes = () => {
    const usedTypes = addresses.map((addr) => addr.type);
    const allTypes = [
      { value: "home", label: "🏠 Home", disabled: usedTypes.includes("home") },
      {
        value: "work",
        label: "🏢 Office",
        disabled: usedTypes.includes("work"),
      },
      { value: "other", label: "📍 Other", disabled: false },
    ];
    return allTypes;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Saved Addresses
          </DialogTitle>
          <DialogDescription>
            Manage your saved addresses for quick booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new address button */}
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

          {/* Address list */}
          <div className="space-y-3">
            {addresses.map((address) => (
              <Card
                key={address.id}
                className="border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getAddressIcon(address.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {address.label}
                          </h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${getAddressTypeColor(address.type)}`}
                          >
                            {address.type.charAt(0).toUpperCase() +
                              address.type.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {address.fullAddress}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {address.createdAt && (
                            <span>
                              Added:{" "}
                              {new Date(address.createdAt).toLocaleDateString()}
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

                    <div className="flex items-center gap-2">
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
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAddress(address.id!)}
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
          </div>

          {addresses.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Saved Addresses
              </h3>
              <p className="text-gray-600 mb-4">
                Add your frequently used addresses for quick booking
              </p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Address
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Address Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
            <DialogDescription>
              Fill in the address details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Address Type Selection */}
            <div>
              <Label className="text-sm font-medium">Address Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {getAvailableTypes().map((type) => (
                  <Button
                    key={type.value}
                    variant="outline"
                    disabled={type.disabled}
                    className={`p-3 h-auto ${type.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      // This will be handled by the form
                    }}
                  >
                    {type.label}
                    {type.disabled && (
                      <span className="text-xs block text-gray-500">
                        Already added
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <EnhancedAddressForm
              onAddressUpdate={handleAddAddress}
              showLabel={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Address Modal */}
      <Dialog
        open={!!editingAddress}
        onOpenChange={() => setEditingAddress(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
            <DialogDescription>
              Update the address details below
            </DialogDescription>
          </DialogHeader>

          {editingAddress && (
            <EnhancedAddressForm
              initialAddress={editingAddress}
              onAddressUpdate={handleEditAddress}
              showLabel={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedAddressesModal;
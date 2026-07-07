import React, { createContext, useContext, useEffect, useState } from 'react';
import vendorClient from '@api/vendor-client';
import {
  createSeller,
  listMySellerMemberships,
  loginMember,
  logoutSeller,
  registerMemberAuthIdentity,
  setCurrentSellerId,
  type VendorSeller,
} from '@api/vendor-api';

export type RegisterSellerInput = {
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  currencyCode?: string;
};

type SellerContextType = {
  seller?: VendorSeller;
  isSellerLoading: boolean;
  isSeller: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerSeller: (input: RegisterSellerInput) => Promise<VendorSeller>;
  refreshSeller: () => Promise<VendorSeller | undefined>;
};

const SellerContext = createContext<SellerContextType | null>(null);

type SellerProviderProps = {
  children: React.ReactNode;
};

export const SellerProvider = ({ children }: SellerProviderProps) => {
  const [seller, setSeller] = useState<VendorSeller>();
  const [isSellerLoading, setIsSellerLoading] = useState(true);

  useEffect(() => {
    refreshSeller();
  }, []);

  // Vendor routes authenticate the "member" actor and are scoped to
  // whichever seller's id we send as `x-seller-id`. A member could in
  // theory belong to more than one seller - we keep this simple and just
  // use the first one.
  const refreshSeller = async (): Promise<VendorSeller | undefined> => {
    try {
      const { seller_members } = await listMySellerMemberships();
      const membership = seller_members[0];
      if (!membership) {
        setCurrentSellerId(undefined);
        setSeller(undefined);
        return undefined;
      }
      setCurrentSellerId(membership.seller_id);
      setSeller(membership.seller);
      return membership.seller;
    } catch {
      setCurrentSellerId(undefined);
      setSeller(undefined);
      return undefined;
    } finally {
      setIsSellerLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    await loginMember(email, password);
    await refreshSeller();
  };

  const logout = async () => {
    await logoutSeller();
    setSeller(undefined);
  };

  const registerSeller = async ({
    businessName,
    ownerName,
    email,
    phone,
    password,
    currencyCode,
  }: RegisterSellerInput) => {
    const [firstName, ...restName] = ownerName.trim().split(/\s+/);

    // Step 1: create a "member" auth identity. The resulting token isn't
    // linked to any seller yet (empty actor_id) but is enough to prove
    // this email/password pair belongs to the caller.
    const registrationToken = await registerMemberAuthIdentity(
      email,
      password,
    );
    await vendorClient.client.setToken(registrationToken);

    // Step 2: create the seller with this member as its owner. The seller
    // starts out `pending_approval`, but the member can use every vendor
    // API immediately - approval only affects whether the storefront shows
    // the seller/products publicly.
    await createSeller({
      name: businessName,
      email,
      member_email: email,
      currency_code: currencyCode || 'tzs',
      phone,
      first_name: firstName,
      last_name: restName.join(' ') || undefined,
    });

    // Step 3: the registration token has no actor_id, so it can't be used
    // for further authenticated calls - log in fresh to get a token that's
    // actually linked to the new member/seller, then load that seller into
    // context so the caller can go straight to the dashboard/upload flow.
    await loginMember(email, password);
    const newSeller = await refreshSeller();
    if (!newSeller) {
      throw new Error('Seller was created but could not be loaded.');
    }
    return newSeller;
  };

  return (
    <SellerContext.Provider
      value={{
        seller,
        isSellerLoading,
        isSeller: !!seller,
        login,
        logout,
        registerSeller,
        refreshSeller,
      }}
    >
      {children}
    </SellerContext.Provider>
  );
};

export const useSeller = () => {
  const context = useContext(SellerContext);

  if (!context) {
    throw new Error('useSeller must be used within a SellerProvider');
  }

  return context;
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { HttpTypes } from '@medusajs/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REGION } from '@env';
import apiClient from '@api/client';

const REGION_KEY = 'region_id';

const pickDefaultRegion = (
  regions: HttpTypes.StoreRegion[],
): HttpTypes.StoreRegion | undefined => {
  if (!regions.length) {
    return undefined;
  }

  const code = (DEFAULT_REGION || 'tz').toLowerCase();

  return (
    regions.find(
      region =>
        region.countries?.some(
          country => country.iso_2?.toLowerCase() === code,
        ) ||
        region.currency_code?.toLowerCase() === code ||
        region.name?.toLowerCase().includes(code),
    ) ?? regions[0]
  );
};

type RegionContextType = {
  region?: HttpTypes.StoreRegion;
  setRegion: React.Dispatch<
    React.SetStateAction<HttpTypes.StoreRegion | undefined>
  >;
};

const RegionContext = createContext<RegionContextType | null>(null);

type RegionProviderProps = {
  children: React.ReactNode;
};

export const RegionProvider = ({ children }: RegionProviderProps) => {
  const [region, setRegion] = useState<HttpTypes.StoreRegion>();

  useEffect(() => {
    if (region?.id) {
      // set its ID in the local storage in
      // case it changed
      AsyncStorage.setItem(REGION_KEY, region.id);
      return;
    }

    AsyncStorage.getItem(REGION_KEY).then(regionId => {
      if (!regionId) {
        apiClient.store.region.list().then(data => {
          setRegion(pickDefaultRegion(data.regions));
        });
      } else {
        apiClient.store.region
          .retrieve(regionId)
          .then(({ region: dataRegion }) => {
            setRegion(dataRegion);
          })
          .catch(() => {
            apiClient.store.region.list().then(data => {
              setRegion(pickDefaultRegion(data.regions));
            });
          });
      }
    });
  }, [region?.id]);

  return (
    <RegionContext.Provider
      value={{
        region,
        setRegion,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);

  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }

  return context;
};

export const useCountries = () => {
  const { region } = useRegion();
  return region?.countries;
};

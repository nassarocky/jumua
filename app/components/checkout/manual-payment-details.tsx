import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { useColors } from '@styles/hooks';
import {
  SellerPaymentAccount,
  getPaymentDetailRows,
} from '@utils/seller-payment-details';

type ManualPaymentDetailsProps = {
  accounts: SellerPaymentAccount[];
  isLoading?: boolean;
};

const ManualPaymentDetails = ({
  accounts,
  isLoading = false,
}: ManualPaymentDetailsProps) => {
  const { l10n } = useLocalization();
  const colors = useColors();

  if (isLoading) {
    return (
      <View className="items-center py-2">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="text-gray-500 mt-2 text-sm">
          {l10n.getString('loading-payment-details')}...
        </Text>
      </View>
    );
  }

  if (!accounts.length) {
    return (
      <Text className="text-content opacity-70">
        {l10n.getString('no-payment-details-available')}
      </Text>
    );
  }

  return (
    <View className="gap-4">
      <Text className="font-content-bold text-base text-content">
        {l10n.getString('payment-details')}
      </Text>
      <Text className="text-sm text-content opacity-70">
        {l10n.getString('manual-payment-instructions')}
      </Text>
      {accounts.map((account, index) => (
        <View
          key={account.id}
          className={`gap-3 ${index > 0 ? 'pt-4 border-t border-gray-200' : ''}`}
        >
          {accounts.length > 1 && (
            <Text className="font-content-bold text-content">
              {account.sellerName}
            </Text>
          )}
          {getPaymentDetailRows(account).map(row => (
            <View key={row.labelKey} className="gap-1">
              <Text className="text-xs text-content opacity-50">
                {l10n.getString(row.labelKey)}
              </Text>
              <Text className="text-base font-content-bold text-content">
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default ManualPaymentDetails;

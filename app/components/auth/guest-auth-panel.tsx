import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { useNavigation } from '@react-navigation/native';
import RegisterForm from './register-form';

type GuestAuthPanelProps = {
  defaultPhone?: string;
  messageKey?: 'create-account-to-view-orders' | 'sign-in-to-view-orders';
  redirectTo?: 'Orders';
};

const GuestAuthPanel = ({
  defaultPhone,
  messageKey = 'create-account-to-view-orders',
  redirectTo = 'Orders',
}: GuestAuthPanelProps) => {
  const { l10n } = useLocalization();
  const navigation = useNavigation();

  return (
    <>
      <Text className="text-base text-content text-center mb-6 px-2">
        {l10n.getString(messageKey)}
      </Text>

      <RegisterForm
        defaultPhone={defaultPhone}
        footer={
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('SignIn', { redirectTo })
            }
          >
            <Text className="text-center text-primary">
              {l10n.getString('already-have-an-account')}
            </Text>
          </TouchableOpacity>
        }
      />
    </>
  );
};

export default GuestAuthPanel;

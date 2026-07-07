import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { CommonActions, useNavigation } from '@react-navigation/native';
import Navbar from '@components/common/navbar';
import RegisterForm from '@components/auth/register-form';

const Register = () => {
  const { l10n } = useLocalization();
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('register')} />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          <RegisterForm
            onSuccess={() =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Main',
                      state: {
                        routes: [{ name: 'Profile' }],
                      },
                    },
                  ],
                }),
              )
            }
            footer={
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text className="text-center text-primary">
                  {l10n.getString('already-have-an-account')}
                </Text>
              </TouchableOpacity>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default Register;

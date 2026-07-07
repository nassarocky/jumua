import React, { useState } from 'react';
import { View, TouchableOpacity, Keyboard } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import Input from '@components/common/input';
import { useSeller } from '@data/seller-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import Navbar from '@components/common/navbar';
import Button from '@components/common/button';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const sellerSignInSchema = z.object({
  email: z.string().email('invalid-email-address'),
  password: z.string().min(1, 'password-must-be-at-least-n-characters'),
});

type SellerSignInSchema = z.infer<typeof sellerSignInSchema>;

const SellerLogin = () => {
  const { l10n } = useLocalization();
  const [loading, setLoading] = useState(false);
  const { login } = useSeller();
  const navigation = useNavigation();

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: { errors },
  } = useForm<SellerSignInSchema>({
    resolver: zodResolver(sellerSignInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SellerSignInSchema) => {
    try {
      Keyboard.dismiss();
      setLoading(true);
      await login(data.email, data.password);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'SellerDashboard' }],
        }),
      );
    } catch (err) {
      setFormError('root', {
        type: 'manual',
        message:
          err instanceof Error
            ? err.message
            : l10n.getString('invalid-credentials'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('seller-sign-in')} />

      <View className="p-4 flex-1">
        <View className="gap-4">
          {errors.root && (
            <Text className="text-red-500 text-center">
              {errors.root.message}
            </Text>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label={l10n.getString('email')}
                placeholder={l10n.getString('enter-your-email')}
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                error={
                  errors.email?.message
                    ? l10n.getString(errors.email.message)
                    : undefined
                }
                containerClassName="mb-0"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label={l10n.getString('password')}
                placeholder={l10n.getString('enter-your-password')}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={
                  errors.password?.message
                    ? l10n.getString(errors.password.message, { n: 3 })
                    : undefined
                }
                containerClassName="mb-0"
              />
            )}
          />

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            title={
              loading ? l10n.getString('signing-in') : l10n.getString('sign-in')
            }
          />

          <TouchableOpacity onPress={() => navigation.navigate('BecomeSeller')}>
            <Text className="text-base text-center text-primary">
              {l10n.getString('dont-have-a-seller-account')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SellerLogin;

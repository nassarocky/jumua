import React, { useState } from 'react';
import { View, ScrollView, Keyboard } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import Input from '@components/common/input';
import Button from '@components/common/button';
import Navbar from '@components/common/navbar';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { useSeller } from '@data/seller-context';

const becomeSellerSchema = z.object({
  businessName: z.string().min(1, 'business-name-is-required'),
  ownerName: z.string().min(1, 'name-is-required'),
  email: z.string().email('invalid-email-address'),
  phone: z.string().min(1, 'phone-is-required'),
  password: z.string().min(6, 'password-must-be-at-least-n-characters'),
});

type BecomeSellerSchema = z.infer<typeof becomeSellerSchema>;

const BecomeSeller = () => {
  const { l10n } = useLocalization();
  const navigation = useNavigation();
  const { registerSeller } = useSeller();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: { errors },
  } = useForm<BecomeSellerSchema>({
    resolver: zodResolver(becomeSellerSchema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: BecomeSellerSchema) => {
    try {
      Keyboard.dismiss();
      setLoading(true);
      await registerSeller(data);
      // The seller can start using every vendor feature right away - store
      // approval only affects public visibility, so there's no need to make
      // them sign in again.
      navigation.reset({
        index: 0,
        routes: [{ name: 'UploadProduct' }],
      });
    } catch (err) {
      setFormError('root', {
        type: 'manual',
        message:
          err instanceof Error
            ? err.message
            : l10n.getString('registration-failed'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('become-a-seller')} />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <Text className="opacity-70 mb-2">
            {l10n.getString('become-a-seller-description')}
          </Text>

          {errors.root && (
            <Text className="text-red-500 text-center">
              {errors.root.message}
            </Text>
          )}

          <Controller
            control={control}
            name="businessName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={l10n.getString('business-name')}
                placeholder={l10n.getString('enter-your-business-name')}
                value={value}
                onChangeText={onChange}
                error={
                  errors.businessName?.message
                    ? l10n.getString(errors.businessName.message)
                    : undefined
                }
                containerClassName="mb-0"
              />
            )}
          />

          <Controller
            control={control}
            name="ownerName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={l10n.getString('your-name')}
                placeholder={l10n.getString('enter-your-name')}
                value={value}
                onChangeText={onChange}
                error={
                  errors.ownerName?.message
                    ? l10n.getString(errors.ownerName.message)
                    : undefined
                }
                containerClassName="mb-0"
              />
            )}
          />

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
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label={l10n.getString('phone')}
                placeholder={l10n.getString('enter-your-phone')}
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
                error={
                  errors.phone?.message
                    ? l10n.getString(errors.phone.message)
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
                    ? l10n.getString(errors.password.message, { n: 6 })
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
              loading
                ? l10n.getString('submitting')
                : l10n.getString('submit-application')
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default BecomeSeller;

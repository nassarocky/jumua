import React, { useState } from 'react';
import { View, Keyboard } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import Input from '@components/common/input';
import Button from '@components/common/button';
import { useCustomer } from '@data/customer-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isValidPhoneNumber } from '@utils/phone-auth';

export const registerSchema = z.object({
  firstName: z.string().min(1, 'first-name-is-required'),
  lastName: z.string().min(1, 'last-name-is-required'),
  phone: z
    .string()
    .min(1, 'phone-is-required')
    .refine(isValidPhoneNumber, 'invalid-phone-number'),
  password: z.string().min(6, 'password-must-be-at-least-n-characters'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterFormProps = {
  defaultPhone?: string;
  onSuccess?: () => void;
  footer?: React.ReactNode;
};

const RegisterForm = ({
  defaultPhone = '',
  onSuccess,
  footer,
}: RegisterFormProps) => {
  const { l10n } = useLocalization();
  const [loading, setLoading] = useState(false);
  const { register: registerCustomer } = useCustomer();

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: defaultPhone,
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      Keyboard.dismiss();
      setLoading(true);
      await registerCustomer(
        data.phone,
        data.password,
        data.firstName,
        data.lastName,
      );
      onSuccess?.();
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
    <View className="gap-4">
      {errors.root && (
        <Text className="text-red-500 text-center">{errors.root.message}</Text>
      )}

      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, value } }) => (
          <Input
            label={l10n.getString('first-name')}
            placeholder={l10n.getString('enter-your-first-name')}
            value={value}
            onChangeText={onChange}
            error={
              errors.firstName?.message
                ? l10n.getString(errors.firstName.message)
                : undefined
            }
            containerClassName="mb-0"
          />
        )}
      />

      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, value } }) => (
          <Input
            label={l10n.getString('last-name')}
            placeholder={l10n.getString('enter-your-last-name')}
            value={value}
            onChangeText={onChange}
            error={
              errors.lastName?.message
                ? l10n.getString(errors.lastName.message)
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
            autoCapitalize="none"
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
            ? l10n.getString('creating-account')
            : l10n.getString('create-account')
        }
      />

      {footer}
    </View>
  );
};

export default RegisterForm;
